/*!
 * 
 *     MCAFEE RESTRICTED CONFIDENTIAL
 *     Copyright (c) 2026 McAfee, LLC
 *
 *     The source code contained or described herein and all documents related
 *     to the source code ("Material") are owned by McAfee or its
 *     suppliers or licensors. Title to the Material remains with McAfee
 *     or its suppliers and licensors. The Material contains trade
 *     secrets and proprietary and confidential information of McAfee or its
 *     suppliers and licensors. The Material is protected by worldwide copyright
 *     and trade secret laws and treaty provisions. No part of the Material may
 *     be used, copied, reproduced, modified, published, uploaded, posted,
 *     transmitted, distributed, or disclosed in any way without McAfee's prior
 *     express written permission.
 *
 *     No license under any patent, copyright, trade secret or other intellectual
 *     property right is granted to or conferred upon you by disclosure or
 *     delivery of the Materials, either expressly, by implication, inducement,
 *     estoppel or otherwise. Any license under such intellectual property rights
 *     must be expressed and approved by McAfee in writing.
 *
 */(()=>{class e extends AudioWorkletProcessor{constructor(){super(),this.defaultSampleSize=64e3,this.sampleRate=16e3,this.isRecording=!1,this.isRecordingStop=!1,this.firstChunk=!0,this.buffer=new Float32Array(this.defaultSampleSize),this.bufferIndex=0,this.port.onmessage=this.handleMessage.bind(this),this.totalChannels=-1,this.secondsRecorded=0,this.hasNonZeroStarted=!1}findNonZeroStartIndex(e){if(this.hasNonZeroStarted)return 0;const s=e[0],t=e[1]||null;for(let e=0;e<s.length;e++){if(0!==(t?(s[e]+t[e])/2:s[e]))return this.hasNonZeroStarted=!0,e}return-1}process(e){const s=e[0];if(!this.isRecording||0===s.length)return!this.isRecordingStop;let t=0;if(!this.hasNonZeroStarted&&(t=this.findNonZeroStartIndex(s),-1===t))return!0;switch(this.totalChannels=s.length,this.totalChannels){case 1:default:this.saveAudioFrame(s[0],t);break;case 2:this.handleDuoChannelsAudioFrame(s,t)}return!this.isRecordingStop}saveAudioFrame(e,s=0){let t=e;0!==s&&(t=e.subarray(s)),this.checkAndResizeBuffer(t),this.buffer.set(t,this.bufferIndex),this.bufferIndex+=t.length,this.bufferIndex>=this.sampleSize&&this.sendBuffer()}handleDuoChannelsAudioFrame(e,s=0){const t=[],i=e[0],r=e[1];for(let e=s;e<i.length;e++)t.push((i[e]+r[e])/2);this.saveAudioFrame(t)}checkAndResizeBuffer(e){if(this.bufferIndex+e.length>this.buffer.length){const s=this.bufferIndex+e.length,t=new Float32Array(s);t.set(this.buffer),this.buffer=t}}handleMessage({data:e}){"start"===e.state&&(this.sampleSize=e.sampleRate*e.chunksize||this.defaultSampleSize,this.sampleRate=e.sampleRate,this.buffer=new Float32Array(this.sampleSize),this.bufferIndex=0,this.isRecording=!0,this.guid=e.guid),"stop"===e.state&&(this.isRecording=!1,this.sendBuffer(!0,e.videoEnded),this.isRecordingStop=!0,this.port.postMessage({buffer:null,state:e.state}))}sendBuffer(e=!1,s=!1){this.secondsRecorded+=this.bufferIndex/this.sampleRate,this.port.postMessage({buffer:this.buffer.buffer,guid:this.guid,videoEnded:s,isLast:e,totalChannels:this.totalChannels,firstChunk:this.firstChunk,secondsRecorded:this.secondsRecorded},[this.buffer.buffer]),this.firstChunk=!1,this.buffer=new Float32Array(this.sampleSize),this.bufferIndex=0}}registerProcessor("pcm-processor",e)})();
//# sourceMappingURL=../../sourceMap/chrome/MockingBird-Package/scripts/worklet_processor.js.map