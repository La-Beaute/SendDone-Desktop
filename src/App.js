import React,{Component} from 'react';
import View  from './components/View'

class App extends Component {
  constructor(props){
    super(props);
  }
  render() {
    return(
      <div className = 'App'>
        <View {...viewData}></View>
      </div>
    );
  }
}

const viewData = {
  backgroundColorGradient: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/background-color-gradient@1x.png",
  android: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/image-35@2x.png",
  image36: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/image-36@2x.png",
  iphone: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/image-35@2x.png",
  image362: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/image-36-1@2x.png",
  desktop: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/desktop@2x.png",
  id3_ip: "192.168.0.7",
  id3: "ID3",
  id2_ip: "192.168.0.6",
  id2: "ID2",
  id1_ip: "192.168.0.5",
  id1: "ID1",
  scan: "② SCAN",
  Folder: "+ FOLDER",
  File: "+ FILE",
  xdelete: "Delete",
  file1_txt: "     /home/th/memo3.txt",
  file3: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-1@2x.png",
  overlapGroup5: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-1@2x.png",
  vector2: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-3@2x.png",
  vector3: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-4@2x.png",
  vector4: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-3@2x.png",
  vector5: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-4@2x.png",
  file3_txt: "/home/th/memo2.txt",
  file2_txt: "/home/th/memo1.txt",
  folder1_txt: "/home/th",
  vector6: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-9@2x.png",
  vector7: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-10@2x.png",
  text1: "① FILE SELECT",
  vector8: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-11@2x.png",
  vector9: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-12@2x.png",
  vector10: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-13@2x.png",
  overlapGroup9: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-14@2x.png",
  vector11: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-15@2x.png",
  vector12: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-16@2x.png",
  expose: "Expose",
  setting: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-17@2x.png",
  vector13: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-18@2x.png",
  info: <>Hi, asdf<br />192.168.0.2</>,
  title: "SendDone",
  place: " SEND",
  file2Props: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-7@2x.png",
  file22Props: "https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector-7@2x.png",
};

export default App;
