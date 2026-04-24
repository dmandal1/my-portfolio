import React from "react";
import "./SoftwareSkill.css";
import { Icon } from "@iconify/react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

const DARK_MODE_ICON_OVERRIDES = {
  ExpressJs: "#E8F1FF",
  GitHub: "#E8F1FF",
  "Amazon Web Services": "#FBBF24",
  "Adobe Photoshop": "#31A8FF",
  "Adobe Illustrator": "#FF9A00",
  "Adobe XD": "#FF61F6",
};

function isDarkPortfolioTheme(theme) {
  return theme?.body === "#08111f" || theme?.text === "#E8F1FF";
}

function normalizeHexColor(color) {
  if (typeof color !== "string" || !color.startsWith("#")) {
    return null;
  }

  const hex = color.slice(1);
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return hex
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase();
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return hex.toUpperCase();
  }

  return null;
}

function getRelativeLuminance(hexColor) {
  const channels = [0, 2, 4].map((index) => {
    const channel = parseInt(hexColor.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function getIconStyle(logo, theme) {
  const baseStyle = logo.style || {};

  if (!isDarkPortfolioTheme(theme)) {
    return baseStyle;
  }

  const overrideColor = DARK_MODE_ICON_OVERRIDES[logo.skillName];
  if (overrideColor) {
    return {
      ...baseStyle,
      color: overrideColor,
      backgroundColor:
        baseStyle.backgroundColor === "#000000"
          ? "rgba(232, 241, 255, 0.08)"
          : baseStyle.backgroundColor,
    };
  }

  const hexColor = normalizeHexColor(baseStyle.color);
  const isTooDarkForTheme =
    hexColor && getRelativeLuminance(hexColor) < 0.075;

  if (!isTooDarkForTheme) {
    return baseStyle;
  }

  return {
    ...baseStyle,
    color: theme.imageHighlight || "#60A5FA",
    backgroundColor: "transparent",
  };
}

class SoftwareSkill extends React.Component {
  render() {
    const { logos, theme } = this.props;
    return (
      <div>
        <div className="software-skills-main-div">
          <ul className="dev-icons">
            {logos.map((logo) => {
              return (
                <OverlayTrigger
                  key={logo.skillName}
                  placement={"top"}
                  overlay={
                    <Tooltip id={`tooltip-top`}>
                      <strong>{logo.skillName}</strong>
                    </Tooltip>
                  }
                >
                  <li className="software-skill-inline" name={logo.skillName}>
                    <Icon
                      icon={logo.fontAwesomeClassname}
                      style={getIconStyle(logo, theme)}
                    />
                  </li>
                </OverlayTrigger>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
}

export default SoftwareSkill;
