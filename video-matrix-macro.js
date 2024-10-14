/********************************************************
 * 
 * Macro Author:      	William Mills
 *                    	Technical Solutions Specialist 
 *                    	wimills@cisco.com
 *                    	Cisco Systems
 * 
 * Version: 1-0-0
 * Released: 10/14/24
 * 
 * This is an example macro which automatically applies a video
 * matrix on specific display outputs from a Cisco Codec.
 * 
 * 
 * Full Readme, source code and license details for this macro are available 
 * on Github: https://github.com/wxsd-sales/video-matrix-macro
 * 
 ********************************************************/
import xapi from 'xapi';

/*********************************************************
 * Configure the settings below
**********************************************************/

const config = {
  button: {
    name: 'Display Controls',
    color: '#f58142',
    icon: 'Sliders'
  },
  layouts: [
    {
      id: 1,
      output: 2,
      inputs: [2, 2, 2, 2],
      layout: 'equal',
      name: 'Four Equal'
    },
    {
      id: 2,
      output: 2,
      inputs: [2, 2],
      layout: 'equal',
      name: 'Two Equal'
    },
    {
      id: 3,
      output: 1,
      inputs: [2, 2],
      layout: 'prominent',
      name: 'Two Prominent'
    },
    {
      id: 4,
      output: 1,
      inputs: [2, 2, 2],
      layout: 'equal',
      name: 'Three Equal'
    }
  ],
  defaultLayouts: [1, 3],
  showPanel: true,
  panelId: 'videoMatrixAutoLayout'
}

/*********************************************************
 * Do not change below
**********************************************************/

let videoMatrix = {};
let callId = null;


// Update Panel as Display Connection state changes
xapi.Status.Video.Output.Connector.Connected.on(async () => {
  await createPanel();
  syncUI();
})


xapi.Status.Call.on(({ ghost, AnswerState, id }) => {
  if (AnswerState && AnswerState == 'Answered' && callId != id) return processCallStart(id);
  if (ghost && callId) return processCallEnd(id);
})

xapi.Event.UserInterface.Extensions.Widget.Action.on(async ({ Type, WidgetId, Value }) => {
  console.log('Widget Action, type', Type, 'widgetid', WidgetId, 'value', Value)
  if (!WidgetId.startsWith(config.panelId)) return

  const [_panelId, option] = WidgetId.split('-');

  if (Type == 'pressed' && option == 'resetAll') return resetAllMatix()

  const call = await xapi.Status.Call.get();
  const inCall = call?.[0]?.Status == 'Connected';
  if (!inCall) return
  if (Type == 'released' && option == 'layout') return applyMatix(Value)
  if (Type == 'changed' && option == 'autoApply') return applyMatix(config.layout[Value])

});

init();

async function init() {

  // Identify Video Outputs
  const outputs = await xapi.Status.Video.Output.Connector.get();

  // Initialize videoMatrix object to track assign/resets
  outputs.forEach(output => videoMatrix[output.id] = null)

  console.log('Video Out', videoMatrix)

  if (config.showPanel) {
    await createPanel();
    return syncUI()

  } else {
    deletePanel();
  }

}



async function processCallStart(id) {
  console.log('Processing Call Start - CallId:', id);
  callId = id;

  // Make sure the default layout string is valid
  const defaultLayouts = config?.defaultLayouts;
  if (!defaultLayouts) return
  if (defaultLayouts.length == 0) return

  const validDefaults = defaultLayouts.length > 1;
  const selectedControlWidget = await getWidgetValue(`${config.panelId}-newCallBehaviour`);

  console.log('Currently Selected Behaviour:', selectedControlWidget)

  if (selectedControlWidget == 'defaults' && validDefaults) {
    console.log('Applying Default Layouts -', defaultLayouts)
    const matchedLayouts = config.layouts.filter(layout => defaultLayouts.includes(layout.id))
    matchedLayouts.forEach( layout => {
      applyMatix(layout.id);
      syncUI();
    })
    return
  }

  if (selectedControlWidget == 'selected') {
    console.log('Applying Currently Selected')
    const connected = await getConnectedVideoOutputs();
    for (let i = 0; i < connected.length; i++) {
      const selected = await getWidgetValue(`${config.panelId}-layout-${connected[i]}`)
      console.log('Display', connected[i], 'selected layout', selected)
      if (selected != '') applyMatix(selected)
    }
    return
  }

  if (selectedControlWidget == 'reset') {
    console.log('Restting Layouts')
    resetAllMatix();
    syncUI();
    return
  }

}


async function processCallEnd() {
  console.log('Processing Call End');
  callId = null;
  resetAllMatix();
}

async function applyMatix(layoutId) {
  const matchedLayout = config.layouts.find(layout => layoutId == layout.id)
  const { inputs, output, layout, id } = matchedLayout;
  if (videoMatrix[output] == id) return resetMatix(output)
  const outputStatus = await xapi.Status.Video.Output.Connector[output].Connected.get()
  console.log('Video Output:', output, ' Connected:', outputStatus)
  if(outputStatus != 'True') return
  console.log('Applying Video Matrix - Inputs:', inputs, 'Outputs:', output, 'Layout:', layout)
  videoMatrix[output] = id;
  xapi.Command.Video.Matrix.Assign({ SourceId: inputs, Output: output, Layout: layout })
}

function resetAllMatix() {
  for (const [key, value] of Object.entries(videoMatrix)) {
    if (value != null) resetMatix(key)
  }
}

function resetMatix(output) {
  console.log('Resetting Video Matrix - Output:', output)
  videoMatrix[output] = null;
  xapi.Command.Video.Matrix.Reset({ Output: output })
  if (!config.showPanel) return
  console.log('Resetting Widget', `${config.panelId}-layout-${output}`)
  xapi.Command.UserInterface.Extensions.Widget.UnsetValue({ WidgetId: `${config.panelId}-layout-${output}` });
}


async function getConnectedVideoOutputs() {
  const outputs = await xapi.Status.Video.Output.Connector.get();
  const connected = outputs.filter(output => output.Connected == 'True')
  return connected.map(output => parseInt(output.id))
}

async function getWidgetValue(widgetId) {
  const widgets = await xapi.Status.UserInterface.Extensions.Widget.get();
  const matchedWidget = widgets.find(widget => widget.WidgetId == widgetId);
  if (!matchedWidget) return
  return matchedWidget.Value;
}



async function syncUI() {
  const defaultLayouts = config?.defaultLayouts;
  if (!defaultLayouts) return
  if (defaultLayouts.length == 0) return

  const connected = await getConnectedVideoOutputs();

  defaultLayouts.forEach(layoutId => {
    const matchedLayout = config.layouts.find(layout => layoutId == layout.id)
    if (matchedLayout && connected.includes(matchedLayout.output)) {
      xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: `${config.panelId}-layout-${matchedLayout.output}`,
        Value: layoutId
      });
    }
  })

}


function createLayoutRow(layouts, output) {
  console.log('Creating layout row', output)
  const panelId = config.panelId;
  const defaultLayouts = config?.defaultLayouts;
  const filteredLayouts = layouts.filter(layout => layout.output == output);
  if (filteredLayouts.length == 0) return
  console.log('Default Layouts:', defaultLayouts)
  const values = filteredLayouts.map((layout) => {
    const name = defaultLayouts.find(id => id == layout.id) ? `⍟ ${layout.name}` : layout.name;
    return `<Value><Key>${layout.id}</Key><Name>${name}</Name></Value>`
  }).join('')
  return `
      <Row>
        <Name>Display ${output}</Name>
        <Widget>
          <WidgetId>${panelId}-layout-${output}</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4;columns=4</Options>
          <ValueSpace>
            ${values}
          </ValueSpace>
        </Widget>
      </Row>`
}


function createCallBehaviourGroup(hasDefaults) {
  const panelId = config.panelId;


  const allowDefaults = (hasDefaults) ?
    `<Value><Key>defaults</Key><Name>Apply Defaults</Name></Value>`
    : '';

  return `<Row>
        <Name>New Call Behaviour</Name>
        <Widget>
          <WidgetId>${panelId}-newCallBehaviour</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4</Options>
          <ValueSpace>
            ${allowDefaults}
            <Value>
              <Key>selected</Key>
              <Name>Apply Selected</Name>
            </Value>
            <Value>
              <Key>reset</Key>
              <Name>Reset Displays</Name>
            </Value>
          </ValueSpace>
        </Widget>
      </Row>`

}

function createResetRow(hasDefaults) {
  const panelId = config.panelId;

  const defaultText = (hasDefaults) ?
    `<Widget>
              <WidgetId>${panelId}-defaultText</WidgetId>
              <Name>⍟ = Default For Display</Name>
              <Type>Text</Type>
              <Options>size=2;fontSize=normal;align=center</Options>
            </Widget>
          `
    : '';

  return `<Row>
            ${defaultText}
            <Widget>
              <WidgetId>${panelId}-resetAll</WidgetId>
              <Name>Reset All Outputs</Name>
              <Type>Button</Type>
              <Options>size=2</Options>
            </Widget>
          </Row>`

}

async function createPanel() {

  const panelId = config.panelId;
  const button = config.button;
  const order = await panelOrder(panelId)
  const outputs = await getConnectedVideoOutputs()
  console.log('Creating panel with', outputs.length, 'displays')
  const layoutRows = outputs.map(output => createLayoutRow(config.layouts, output)).join('')

  const defaultLayouts = config?.defaultLayouts;
  const hasDefaults = defaultLayouts.length > 0;

  const callBehaviourRow = createCallBehaviourGroup(hasDefaults);
  const resetRow = createResetRow(hasDefaults);

  const panel = `
    <Extensions>
      <Panel>
        <Origin>local</Origin>
        <Location>HomeScreenAndCallControls</Location>
        <Icon>${button.icon}</Icon>
        <Color>${button.color}</Color>
        <Name>${button.name}</Name>
        ${order}
        <ActivityType>Custom</ActivityType>
        <Page>
          <Name>${button.name}</Name>
          ${layoutRows}
          ${callBehaviourRow}
          ${resetRow}
          <PageId>${panelId}-main</PageId>
          <Options>hideRowNames=0</Options>
        </Page>
      </Panel>
    </Extensions>`;

  return xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: panelId }, panel);
}


async function panelOrder(panelId) {
  const list = await xapi.Command.UserInterface.Extensions.List({ ActivityType: "Custom" });
  const panels = list?.Extensions?.Panel
  if (!panels) return ''
  const existingPanel = panels.find(panel => panel.PanelId == panelId)
  if (!existingPanel) return ''
  return `<Order>${existingPanel.Order}</Order>`
}

async function deletePanel() {
  const panelId = config.panelId;
  const list = await xapi.Command.UserInterface.Extensions.List({ ActivityType: "Custom" });
  const panels = list?.Extensions?.Panel
  if (!panels) return
  const existingPanel = panels.find(panel => panel.PanelId == panelId)
  if (existingPanel) xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: panelId });
}
