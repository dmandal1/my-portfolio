import React, { Component } from "react";
import "./Issues.css";
import { Fade } from "../../components/animations/Reveal";
import IssueCard from "../../components/issueCard/IssueCard";
import issuesData from "../../shared/opensource/issues.json";

class Issues extends Component {
  render() {
    const theme = this.props.theme;
    return (
      <div>
        <div className="issues-header-div">
          <Fade direction="up" duration={2000}>
            <h1 className="issues-header" style={{ color: theme.text }}>
              Issues
            </h1>
          </Fade>
        </div>
        <div className="issues-body-div">
          {issuesData.data.map((issue, index) => {
            return <IssueCard key={issue.id} issue={issue} theme={theme} index={index} />;
          })}
        </div>
      </div>
    );
  }
}

export default Issues;
