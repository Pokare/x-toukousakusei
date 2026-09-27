import React from "react";
import { ease, prog, useTime } from "../time";

/** 数字のカウントアップ。from→to を start〜end 秒で。suffix は "+" など */
export const CountUp: React.FC<{
  from?: number;
  to: number;
  start: number;
  end: number;
  decimals?: number;
  suffix?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ from = 0, to, start, end, decimals = 0, suffix, style }) => {
  const t = useTime();
  const p = prog(t, start, end, ease.outQuint);
  const v = from + (to - from) * p;
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {v.toFixed(decimals)}
      {p >= 1 && suffix}
    </span>
  );
};
