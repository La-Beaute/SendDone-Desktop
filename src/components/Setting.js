import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import './Setting.css';

class Setting extends Component{
  render() {
    return (
      <div class="container-center-horizontal">
        <div className="settings screen">
          <div className="overlap-group">
            <img className="background-color-gradient" src={this.props.backgroundColorGradient} alt  = ''/>
            <img className="box3" src={this.props.box3} alt="" />
            <Link to ="./">
              <div className="gobackbutton">
                <div className="overlap-group1">
                  <div className="go-back">{this.props.goBack}</div>
                </div>
              </div>
            </Link>
            <div className="changebutton-1">
              <div className="overlap-group2">
                <div className="place">{this.props.change_text}</div>
              </div>
            </div>
            <div className="idtext valign-text-middle">{this.props.id_Text}</div>
            <div className="my-id roboto-bold-black-30px">{this.props.myId}</div>
            <div className="changebutton-1 changebutton">
              <div className="overlap-group2">
                <div className="place">{this.props.change_text}</div>
              </div>
            </div>
            <div className="locationtext valign-text-middle">{this.props.location_Text}</div>
            <div className="foldericon">
              <div className="overlap-group4">
                <img className="foldericon2" src={this.props.folder_Icon2} alt = ""/>
                <img className="foldericon1" src={this.props.folder_Icon1} alt = ""/>
              </div>
            </div>
            <div className="download-to ">{this.props.downloadTo}</div>
            <div className="settings-1">{this.props.settings}</div>
            <div className="expose2" style={{ backgroundImage: `url(${this.props.expose2})` }}>
              <div className="overlap-group5" style={{ backgroundImage: `url(${this.props.overlapGroup5})` }}>
                <img className="expose2-1" src={this.props.expose21} alt = ""/>
              </div>
            </div>
            <h1 className="title">{this.props.title}</h1>
          </div>
        </div>
      </div>
    )
  }
}

export default Setting;
