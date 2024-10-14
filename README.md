# Video Matrix Macro


This is an example macro which automatically applies a video matrix on specific display outputs from a Cisco Codec.


## Overview

This macro monitors for new calls and can apply a video matrix on indivual video outputs depending on which preconfigured layout is selected.

For example, this layout will apply a video matrix on output 2 with a 2x2 Grid of the input source 2:

```javascript
{
      id: 1,
      output: 2,
      inputs: [2, 2, 2, 2],
      layout: 'equal',
      name: 'Four Equal'
}
```

Use this templete to configure your own layout:

```javascript
{
      id: 1, // Unique Layout index. Only one Layout should have this number. Ideally you should increment 1, 2, 3
      output: < 1,2,3 >,
      inputs: [1, 2, 3, 4], // Array of up to 4 source Ids, example: [1] - [1,2] - [3, 2, 1] 
      layout: '< equal | prominent >',
      name: '< Custom Make For Your Preset >'
}
```


## Setup

### Prerequisites & Dependencies: 

- Codec EQ or Codec Pro with RoomOS 11.x or above
- Web admin access to the device to upload the macro


### Installation Steps:

1. Download the ``video-matrix-macro.js`` file and upload it to your Webex Devices Macro editor via the web interface.
2. Configure the macro layouts config array by adding or removing the layouts you require.
3. Enable the Macro on the editor.
    
    
## Demo

*For more demos & PoCs like this, check out our [Webex Labs site](https://collabtoolbox.cisco.com/webex-labs).

[Vidcast Demo Video](https://app.vidcast.io/share/430d8660-200c-4f24-9521-6ddd94327223)


## License
<!-- MAKE SURE an MIT license is included in your Repository. If another license is needed, verify with management. This is for legal reasons.--> 

<!-- Keep the following statement -->
All contents are licensed under the MIT license. Please see [license](LICENSE) for details.


## Disclaimer
<!-- Keep the following here -->  
 Everything included is for demo and Proof of Concept purposes only. Use of the site is solely at your own risk. This site may contain links to third party content, which we do not warrant, endorse, or assume liability for. These demos are for Cisco Webex use cases, but are not Official Cisco Webex Branded demos.


## Questions
Please contact the WXSD team at [wxsd@external.cisco.com](mailto:wxsd@external.cisco.com?subject=video-matrix-macro) for questions. Or, if you're a Cisco internal employee, reach out to us on the Webex App via our bot (globalexpert@webex.bot). In the "Engagement Type" field, choose the "API/SDK Proof of Concept Integration Development" option to make sure you reach our team. 
