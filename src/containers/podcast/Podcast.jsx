import React from "react";
import "./Podcast.css";
import { podcastSection as defaultPodcastSection } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

export default function Podcast() {
  const data = usePortfolioData();
  const podcastSection = data?.podcastSection || defaultPodcastSection;

  return (
    <div className="main">
      <div className="podcast-header">
        <h1 className="podcast-header-title">{podcastSection.title}</h1>
        <p className="subTitle podcast-header-subtitle">
          {podcastSection.subtitle}
        </p>
      </div>
      <div className="podcast-main-div">
        {(podcastSection.podcast || []).map((podcastLink, i) => (
          <div key={i}>
            <iframe
              title={`podcast-${i}`}
              className="podcast"
              src={podcastLink}
              frameBorder="0"
              scrolling="no"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
