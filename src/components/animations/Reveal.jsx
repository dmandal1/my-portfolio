import React, { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";

const fadeIn = keyframes`from{opacity:0}to{opacity:1}`;
const fadeInUp = keyframes`from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}`;
const fadeInDown = keyframes`from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}`;
const fadeInRight = keyframes`from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}`;
const fadeInLeft = keyframes`from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}`;
const flipInX = keyframes`
  from{transform:perspective(400px) rotate3d(1,0,0,90deg);opacity:0}
  40%{transform:perspective(400px) rotate3d(1,0,0,-20deg)}
  60%{transform:perspective(400px) rotate3d(1,0,0,10deg);opacity:1}
  80%{transform:perspective(400px) rotate3d(1,0,0,-5deg)}
  to{transform:perspective(400px)}
`;

const directionMap = {
  up: fadeInUp,
  down: fadeInDown,
  left: fadeInLeft,
  right: fadeInRight,
};

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

const AnimWrapper = styled.div`
  ${({ $visible, $animation, $duration, $delay }) =>
    $visible
      ? css`
          animation: ${$animation} ${$duration}ms ${$delay}ms both;
        `
      : "opacity: 0;"}
`;

export function Fade({ children, direction, duration = 1000, delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <AnimWrapper
      ref={ref}
      $visible={visible}
      $animation={direction ? directionMap[direction] : fadeIn}
      $duration={duration}
      $delay={delay}
    >
      {children}
    </AnimWrapper>
  );
}

export function Flip({ children, duration = 1000, delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <AnimWrapper
      ref={ref}
      $visible={visible}
      $animation={flipInX}
      $duration={duration}
      $delay={delay}
    >
      {children}
    </AnimWrapper>
  );
}
