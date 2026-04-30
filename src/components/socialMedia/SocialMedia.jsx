import React from "react";
import "./SocialMedia.css";
import { socialMediaLinks as defaultSocialLinks } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import styled from "styled-components";

const IconWrapper = styled.span`
  i {
    background-color: ${(props) => props.$backgroundColor};
  }
  &:hover i {
    background-color: ${({ theme }) => theme.text};
    transition: 0.3s ease-in;
  }
`;

export default function SocialMedia(props) {
  const data = usePortfolioData();
  const socialMediaLinks = data?.socialLinks || defaultSocialLinks;
  return (
    <div className="social-media-div">
      {socialMediaLinks.map((media) => (
        <a
          href={media.link}
          className="icon-button"
          target="_blank"
          rel="noopener noreferrer"
          key={media.link}
        >
          <IconWrapper $backgroundColor={media.backgroundColor}>
            <i className={`fab ${media.fontAwesomeIcon}`}></i>
          </IconWrapper>
        </a>
      ))}
    </div>
  );
}
