import React from 'react';
import { Theme } from '../types';

interface LiquidBucketProps {
  theme: Theme | 'brand-red';
  isFab?: boolean;
  percent?: number;
  label?: string;
}

export const LiquidBucket: React.FC<LiquidBucketProps> = ({ theme, isFab = false, percent = 50, label = "JK" }) => {
    const themes = {
        marvel: { liquid: "#EF4444", bg: isFab ? "#FFFFFF" : "transparent", stroke: "#1e3a8a", text: "#1e3a8a" },
        batman: { liquid: "#EAB308", bg: "#111827", stroke: "#374151", text: "#FFFFFF" },
        elsa: { liquid: "#F97316", bg: isFab ? "#F0F9FF" : "transparent", stroke: "#0891B2", text: "#0E7490" },
        'brand-red': { liquid: "#EF4444", bg: isFab ? "#FFFFFF" : "transparent", stroke: "#EF4444", text: "#EF4444" }
    };
    const activeKey = (themes[theme as keyof typeof themes] ? theme : 'marvel') as keyof typeof themes;
    const style = themes[activeKey];
    const fillP = Math.min(100, Math.max(0, percent));
    const liquidHeight = (fillP / 100) * 320; 
    const liquidTopY = 480 - liquidHeight;
    const uniqueId = `mask-${isFab ? 'fab' : 'head'}-${activeKey}-${Math.random().toString(36).substr(2, 5)}`;
    const textFill = "#FFFFFF";

    return (
        <svg viewBox="0 0 512 512" className={`w-full h-full transition-all duration-700 ease-in-out ${isFab ? 'drop-shadow-lg' : ''}`} xmlns="http://www.w3.org/2000/svg">
            <defs>
                <clipPath id={uniqueId}><path d="M56 160 L96 480 L416 480 L456 160 Z" /></clipPath>
            </defs>
            <path d="M56 160c0-100 400-100 400 0" fill="none" stroke={style.stroke} strokeWidth="30" strokeLinecap="round" />
            <path d="M56 160 L96 480 L416 480 L456 160 Z" fill={isFab ? style.bg : 'none'} opacity={isFab ? 0.95 : 0} />
            <g clipPath={`url(#${uniqueId})`}>
                 <path d={`M 0 ${liquidTopY} Q 128 ${liquidTopY - 20} 256 ${liquidTopY} T 512 ${liquidTopY} T 768 ${liquidTopY} T 1024 ${liquidTopY} V 500 H 0 Z`} fill={style.liquid} className="animate-wave transition-all duration-700 ease-out" />
            </g>
            <path d="M56 160 L96 480 L416 480 L456 160 Z" fill="none" stroke={style.stroke} strokeWidth="30" strokeLinejoin="round" />
            {label && (
                <text 
                    x="256" 
                    y="350" 
                    fontFamily="Arial Black, Arial, sans-serif" 
                    fontWeight="900" 
                    fontSize={label === "?" ? "240" : "140"} 
                    fill={textFill} 
                    textAnchor="middle"
                    className="transition-all duration-500 select-none"
                    style={{ filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.5))' }}
                >
                    {label}
                </text>
            )}
        </svg>
    );
};
