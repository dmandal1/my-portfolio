import React from "react";
import "./CompetitiveSites.css";
import { Icon } from "@iconify/react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

const DARK_MODE_ICON_OVERRIDES = {
  HackerRank: "#35D979",
  GeeksForGeeks: "#55C878",
  LeetCode: "#FFB84D",
  Codechef: "#D7A86E",
  Codeforces: "#4DB7F5",
};

function isDarkPortfolioTheme(theme) {
  return theme?.body === "#08111f" || theme?.text === "#E8F1FF";
}

function getIconStyle(logo, theme) {
  if (!isDarkPortfolioTheme(theme)) {
    return logo.style;
  }

  return {
    ...logo.style,
    color: DARK_MODE_ICON_OVERRIDES[logo.siteName] || logo.style?.color,
  };
}

class CompetitiveSites extends React.Component {
  render() {
    const { logos, theme } = this.props;
    return (
      <div className="competitive-sites-main-div">
        <ul className="dev-icons">
          {logos.map((logo) => {
            return (
              <OverlayTrigger
                key={logo.siteName}
                placement={"top"}
                style={{ marginBottom: "5px" }}
                overlay={
                  <Tooltip id={`tooltip-top`}>
                    <strong>{logo.siteName}</strong>
                  </Tooltip>
                }
              >
                <li className="competitive-sites-inline" name={logo.siteName}>
                  <a
                    href={logo.profileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon
                      icon={logo.iconifyClassname}
                      style={getIconStyle(logo, theme)}
                    />
                  </a>
                </li>
              </OverlayTrigger>
            );
          })}
        </ul>
      </div>
    );
  }
}

export default CompetitiveSites;
