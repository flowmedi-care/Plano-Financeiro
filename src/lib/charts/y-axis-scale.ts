export function buildYAxisScale(values: number[], step: number) {
  const dataMin = values.length > 0 ? Math.min(...values) : 0;
  const dataMax = values.length > 0 ? Math.max(...values) : 0;

  let domainMin = Math.floor(Math.min(dataMin, 0) / step) * step;
  let domainMax = Math.ceil(Math.max(dataMax, 0) / step) * step;

  if (domainMin === domainMax) {
    domainMin -= step;
    domainMax += step;
  }

  const range = domainMax - domainMin;
  const tickCount = range / step + 1;

  return {
    domain: [domainMin, domainMax] as [number, number],
    tickCount,
    step,
  };
}
