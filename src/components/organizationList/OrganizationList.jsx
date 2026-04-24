import React, { Component } from "react";
import "./OrganizationList.css";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { Fade } from "../animations/Reveal";

const imageModules = import.meta.glob(
  "../../assests/images/**/*.{png,jpg,jpeg,svg,webp}",
  { eager: true }
);
function getLocalImage(filename) {
  const key = `../../assests/images/${filename}`;
  return imageModules[key]?.default ?? "";
}

class OrganizationList extends Component {
  render() {
    return (
      <div className="organizations-main-div">
        <ul className="dev-icons-orgs">
          {this.props.logos.map((logo) => {
            const name = logo.company || logo.login;
            const imgSrc = logo.logo_path
              ? getLocalImage(logo.logo_path)
              : logo.avatarUrl;
            const href = logo.company_url || null;
            return (
              <OverlayTrigger
                key={name}
                placement="top"
                overlay={
                  <Tooltip id={`tooltip-${name}`}>
                    <strong>{name}</strong>
                  </Tooltip>
                }
              >
                <li className="organizations-inline" name={name}>
                  <Fade direction="up" duration={2000}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="organizations-link"
                      >
                        <div className="organizations-img-wrap">
                          <img
                            className="organizations-img"
                            src={imgSrc}
                            alt={name}
                          />
                        </div>
                      </a>
                    ) : (
                      <div className="organizations-img-wrap">
                        <img
                          className="organizations-img"
                          src={imgSrc}
                          alt={name}
                        />
                      </div>
                    )}
                  </Fade>
                </li>
              </OverlayTrigger>
            );
          })}
        </ul>
      </div>
    );
  }
}

export default OrganizationList;
