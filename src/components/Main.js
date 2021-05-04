import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import './Main.css';
import App from '../App';

let isPop = false;
let title = '';
let current_file = 'memo0.txt';
let total = 99;
let current = 0;


class Main extends Component{
    render() {
      return (
        <div className="view">
            { isPop &&
              <Frame6
                title = {title}
                file = {current_file}
                status = {`(${current}/${total})`}>
              </Frame6>
            }
            <div className="overlap-group">
              <img className="background-color-gradient" src={this.props.backgroundColorGradient} alt = ""/>
              <div className="scan-box">
                <div className="box2"></div>
                <div className="selectbox"></div>
                <div className="scroll-bar2">
                  <div className="scroll-bar2-inside"></div>
                </div>
                  <div className="android" style={{ backgroundImage: `url(${this.props.android})` }}>
                    <img className="android-inside" src={this.props.image36} alt = ""/>
                  </div>
                  <div className="iphone" style={{ backgroundImage: `url(${this.props.iphone})` }}>
                    <img className="iphone-inside" src={this.props.image362} alt = ""/>
                  </div>
                  <img className="desktop" src={this.props.desktop} alt = ""/>
                  <div className="id3-ip">{this.props.id3_ip}</div>
                  <div className="id3">{this.props.id3}</div>
                  <div className="id2-ip">{this.props.id2_ip}</div>
                  <div className="id2">{this.props.id2}</div>
                  <div className="id1-ip">{this.props.id1_ip}</div>
                  <div className="id1">{this.props.id1}</div>
              </div>
              <div className="scan-button">
                <div className="button2">
                  <div className="scan">{this.props.scan}</div>
                </div>
              </div>
              <div className="file-select-box">
                <div className="box1"></div>
                <div className="folder-plus-button">
                  <div className="button3">
                    <div className="folder">{this.props.Folder}</div>
                  </div>
                </div>
                <div className="file-plus-button">
                  <div className="button3">
                    <div className="file">{this.props.File}</div>
                  </div>
                </div>
                <div className="delete-button">
                  <div className="button3">
                     <div className="delete">{this.props.xdelete}</div>
                  </div>
                </div>
                <div className="scroll-bar1">
                  <div className="scroll-bar1-inside"></div>
                </div>
                <div className="checkbox4"></div>
                <div className="checkbox3"></div>
                <div className="checkbox2"></div>
                <div className="checkbox1"></div>
                <div className="checkboxall">
                  <img
                    className="vector-10"
                    src="https://anima-uploads.s3.amazonaws.com/projects/608173f03665689c6dd2113c/releases/608174584c75fb89f1db2209/img/vector@2x.png"
                    alt=""
                  />
                </div>
                <div className="file1-txt valign-text-middle">{this.props.file1_txt}</div>
                <div className="file1" style={{backgroundImage: `url(${this.props.file3})`}}>
                    <img className="vector-1" src={this.props.vector2} alt = ""/>
                    <img className="vector-2" src={this.props.vector3} alt = ""/>
                </div>
                <div className="file3-txt valign-text-middle">{this.props.file3_txt}</div>
                <img className="file3" src={this.props.file2Props} alt = ""/>
                <div className="file2-txt valign-text-middle">{this.props.file2_txt}</div>
                <img className="file2" src={this.props.file2Props} alt = ""/>
                <div className="folder1-txt valign-text-middle">{this.props.folder1_txt}</div>
                <div className="folder1">
                    <img className="vector-4" src={this.props.vector6} alt = ""/>
                    <img className="vector" src={this.props.vector7} alt = ""/>
                </div>
              </div>
              <div className="file-select-button">
                <div className="button1">
                  <div className="file-select">{this.props.text1}</div>
                </div>
              </div>
              <div className="language-select-button">
                <img className="vector-5" src={this.props.vector8} alt = ""/>
                <img className="vector-3" src={this.props.vector9} alt = ""/>
                <img className="vector-6" src={this.props.vector10} alt = ""/>
              </div>
              <div className="expose-1">
                <div className="expose-button" style={{ backgroundImage: `url(${this.props.overlapGroup9})` }}>
                  <img className="vector-8" src={this.props.vector11} alt = ""/>
                  <img className="vector-7" src={this.props.vector12} alt = ""/>
                </div>
                <div className="expose valign-text-middle">{this.props.expose}</div>
              </div>
              <Link to = "/setting">
                <div className="setting" style={{ backgroundImage: `url(${this.props.setting})` }}>
                  <img className="vector-9" src={this.props.vector13} alt = ""/>
                </div>
              </Link>
              <div className="info valign-text-middle">{this.props.info}</div>
              <h1 className="title">{this.props.title}</h1>
            </div>
            <Link onClick = {send}>
              <div className="send-button">
                <div className="sendbox">
                    <div className="send">{this.props.place}</div>
                </div>
              </div>
            </Link>
          </div>
        );
    }
}

let interval;

function send() {
  isPop = !isPop
  interval = setInterval(() => {
    title = 'Sending...'
    current += 1;
    current_file = 'memo' + current.toString() + '.txt';

    ReactDOM.render(
      <App/>,
      document.getElementById('root')
    );

    if (current === total) {
      title = 'Complete!'
      ReactDOM.render(
        <App/>,
        document.getElementById('root')
      );
      clearInterval(interval);
    }
  }, 100);
}


function Frame6(props) {
  const {title, file, status} = props;

  return (
        <div className="overlap-group_" >
          <h1 className="title_">{title}</h1>
          <div className="memotxt valign-text-middle">{file}</div>
          <div className="text-111">{status}</div>
          <div className="group-36">
            <div className="overlap-group11">
              <div className="rectangle-351"></div>
              <div className="rectangle-361" style = {{width : `${699 * current / total}px`}}></div>
            </div>
          </div>
          <Link onClick={function () { isPop = false; current = 0; clearInterval(interval);}}>
            <div className="group-35">
              <div className="overlap-group222">
                <div className="close">Close</div>
              </div>
            </div>
          </Link>
        </div>
  );
}




export default Main;