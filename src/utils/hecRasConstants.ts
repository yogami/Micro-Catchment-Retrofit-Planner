export const HEC_RAS_DATA = [
    { time: 0, discharge: 0.000 },
    { time: 5, discharge: 0.013 },
    { time: 10, discharge: 0.037 },
    { time: 15, discharge: 0.057 },
    { time: 20, discharge: 0.076 },
    { time: 25, discharge: 0.072 },
    { time: 30, discharge: 0.063 },
    { time: 35, discharge: 0.053 },
    { time: 40, discharge: 0.042 },
    { time: 45, discharge: 0.030 },
    { time: 50, discharge: 0.018 },
    { time: 55, discharge: 0.008 },
    { time: 60, discharge: 0.000 },
];

export const HEC_RAS_PEAK = 0.076;

export function getHecRasPeakLs(): number {
    return HEC_RAS_PEAK * 1000;
}
