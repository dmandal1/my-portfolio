import React, { Component } from "react";
import PullRequestChart from "../../components/pullRequestChart/PullRequestChart";
import IssueChart from "../../components/issueChart/IssueChart";
import { Fade } from "../../components/animations/Reveal";
import "./OpensourceCharts.css";

class OpensourceCharts extends Component {
  render() {
    const theme = this.props.theme;
    return (
      <div>
        <div className="os-charts-header-div">
          <Fade direction="up" duration={2000}>
            <h1 className="os-charts-header" style={{ color: theme.text }}>
              Contributions
            </h1>
          </Fade>
        </div>
        <div className="os-charts-body-div">
          <PullRequestChart />
          <IssueChart />
        </div>
      </div>
    );
  }
}

export default OpensourceCharts;
