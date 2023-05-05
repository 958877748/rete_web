let ver = 1;
console.log(`v${ver}`);

var numSocket = new Rete.Socket('Number value');

var VueNumControl = {
  props: ['readonly', 'emitter', 'ikey', 'getData', 'putData'],
  template: '<input type="number" :readonly="readonly" :value="value" @input="change($event)" @dblclick.stop="" @pointerdown.stop="" @pointermove.stop=""/>',
  data() {
    return {
      value: 0,
    }
  },
  methods: {
    change(e) {
      this.value = +e.target.value;
      this.update();
    },
    update() {
      if (this.ikey)
        this.putData(this.ikey, this.value)
      this.emitter.trigger('process');
    }
  },
  mounted() {
    this.value = this.getData(this.ikey);
  }
}

class NumControl extends Rete.Control {

  constructor(emitter, key, readonly) {
    super(key);
    this.component = VueNumControl;
    this.props = { emitter, ikey: key, readonly };
  }

  setValue(val) {
    this.vueContext.value = val;
  }
}

class NumComponent extends Rete.Component {

  constructor() {
    super("Number");
  }

  builder(node) {
    var out1 = new Rete.Output('num', "Number", numSocket);

    return node.addControl(new NumControl(this.editor, 'num')).addOutput(out1);
  }

  worker(node, inputs, outputs) {
    outputs['num'] = node.data.num;
  }
}

class AddComponent extends Rete.Component {
  constructor() {
    super("Add");
  }

  builder(node) {
    var inp1 = new Rete.Input('num', "Number", numSocket);
    var inp2 = new Rete.Input('num2', "Number2", numSocket);
    var out = new Rete.Output('num', "Number", numSocket);

    inp1.addControl(new NumControl(this.editor, 'num'))
    inp2.addControl(new NumControl(this.editor, 'num2'))

    return node
      .addInput(inp1)
      .addInput(inp2)
      .addControl(new NumControl(this.editor, 'preview', true))
      .addOutput(out);
  }

  worker(node, inputs, outputs) {
    var n1 = inputs['num'].length ? inputs['num'][0] : node.data.num1;
    var n2 = inputs['num2'].length ? inputs['num2'][0] : node.data.num2;
    var sum = n1 + n2;

    this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(sum);
    outputs['num'] = sum;
  }
}


//解决手机无法右键
class TouchContextMenuPlugin extends ContextMenuPlugin.default {
  constructor(options) {
    super(options);
    this.timerId = null;
  }

  bind(node) {
    node.el.addEventListener('touchstart', (event) => {
      event.preventDefault();
      this.timerId = setTimeout(() => {
        this.show(event, node);
      }, 500);
    });

    node.el.addEventListener('touchend', () => {
      clearTimeout(this.timerId);
    });

    node.el.addEventListener('touchmove', () => {
      clearTimeout(this.timerId);
    });
  }

  unbind(node) {
    node.el.removeEventListener('touchstart');
    node.el.removeEventListener('touchend');
    node.el.removeEventListener('touchmove');
  }

  bindArea() {
    this.editor.view.container.addEventListener('touchstart', (event) => {
      event.preventDefault();
      this.timerId = setTimeout(() => {
        this.show(event);
      }, 500);
    });

    this.editor.view.container.addEventListener('touchend', () => {
      clearTimeout(this.timerId);
    });

    this.editor.view.container.addEventListener('touchmove', () => {
      clearTimeout(this.timerId);
    });
  }

  unbindArea() {
    this.editor.view.container.removeEventListener('touchstart');
    this.editor.view.container.removeEventListener('touchend');
    this.editor.view.container.removeEventListener('touchmove');
  }
}



(async () => {
  var container = document.querySelector('#rete');
  var components = [new NumComponent(), new AddComponent()];

  var editor = new Rete.NodeEditor('demo@0.1.0', container);
  editor.use(ConnectionPlugin.default);
  editor.use(VueRenderPlugin.default);
  // editor.use(ContextMenuPlugin.default);
  editor.use(TouchContextMenuPlugin);
  editor.use(AreaPlugin);
  editor.use(CommentPlugin.default);
  editor.use(HistoryPlugin);
  editor.use(ConnectionMasteryPlugin.default);

  var engine = new Rete.Engine('demo@0.1.0');

  components.map(c => {
    editor.register(c);
    engine.register(c);
  });

  var n1 = await components[0].createNode({ num: 2 });
  var n2 = await components[0].createNode({ num: 0 });
  var add = await components[1].createNode();

  n1.position = [80, 200];
  n2.position = [80, 400];
  add.position = [500, 240];


  editor.addNode(n1);
  editor.addNode(n2);
  editor.addNode(add);

  editor.connect(n1.outputs.get('num'), add.inputs.get('num'));
  editor.connect(n2.outputs.get('num'), add.inputs.get('num2'));


  editor.on('process nodecreated noderemoved connectioncreated connectionremoved', async () => {
    console.log('process');
    await engine.abort();
    await engine.process(editor.toJSON());
  });

  editor.view.resize();
  AreaPlugin.zoomAt(editor);
  editor.trigger('process');
})();