import React, { Component } from "react";
import "./PullRequests.css";
import { Fade } from "../../components/animations/Reveal";
import PullRequestCard from "../../components/pullRequestCard/PullRequestCard";
import pullRequestsData from "../../shared/opensource/pull_requests.json";

class PullRequests extends Component {
  render() {
    const theme = this.props.theme;
    return (
      <div>
        <div className="pull-requests-header-div">
          <Fade direction="up" duration={2000}>
            <h1 className="pull-requests-header" style={{ color: theme.text }}>
              Pull Requests
            </h1>
          </Fade>
        </div>
        <div className="pull-request-body-div">
          {pullRequestsData.data.map((pullRequest, index) => {
            return <PullRequestCard key={pullRequest.id} pullRequest={pullRequest} theme={theme} index={index} />;
          })}
        </div>
      </div>
    );
  }
}

export default PullRequests;
