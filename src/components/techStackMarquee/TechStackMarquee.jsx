import React from "react";
import "./TechStackMarquee.css";
import { Icon } from "@iconify/react";

const TECH_STACK = [
  { name: "React", icon: "simple-icons:react", color: "#61DAFB" },
  { name: "Node.js", icon: "simple-icons:nodedotjs", color: "#68A063" },
  { name: "TypeScript", icon: "simple-icons:typescript", color: "#3178C6" },
  { name: "NestJS", icon: "simple-icons:nestjs", color: "#E0234E" },
  { name: "Python", icon: "logos-python", color: "#3776AB" },
  { name: "Docker", icon: "simple-icons:docker", color: "#2496ED" },
  { name: "AWS", icon: "simple-icons:amazonaws", color: "#FF9900" },
  { name: "PostgreSQL", icon: "simple-icons:postgresql", color: "#4169E1" },
  { name: "MongoDB", icon: "simple-icons:mongodb", color: "#47A248" },
  { name: "Redis", icon: "simple-icons:redis", color: "#DC382D" },
  { name: "JavaScript", icon: "simple-icons:javascript", color: "#F7DF1E" },
  { name: "Express.js", icon: "simple-icons:express", color: "#94A3B8" },
  { name: "GraphQL", icon: "simple-icons:graphql", color: "#E10098" },
  { name: "Git", icon: "simple-icons:git", color: "#F05032" },
  { name: "Tailwind CSS", icon: "simple-icons:tailwindcss", color: "#06B6D4" },
];

export default function TechStackMarquee({ theme }) {
  // Duplicate list to create a seamless infinite loop
  const list = [...TECH_STACK, ...TECH_STACK];

  return (
    <div className="tech-marquee-wrapper" aria-label="Tech Stack Marquee">
      <div className="tech-marquee-fade tech-marquee-fade--left" />
      <div className="tech-marquee-track">
        {list.map((tech, idx) => (
          <div key={`${tech.name}-${idx}`} className="tech-marquee-item">
            <span className="tech-marquee-icon-wrap" style={{ color: tech.color }}>
              <Icon icon={tech.icon} width="20" height="20" />
            </span>
            <span className="tech-marquee-name">{tech.name}</span>
          </div>
        ))}
      </div>
      <div className="tech-marquee-fade tech-marquee-fade--right" />
    </div>
  );
}
