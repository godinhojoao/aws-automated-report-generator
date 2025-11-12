function processData(data) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be a non-empty array');
  }

  if (data.length === 0) {
    throw new Error('Data must be a non-empty array');
  }

  const stats = {
    totalEntries: data.length,
    totalValue: 0,
    averageValue: 0,
    minValue: Infinity,
    maxValue: -Infinity,
    uniqueCategories: new Set(),
    uniqueIds: new Set(),
    dateRange: {
      start: null,
      end: null
    },
    categoryStats: {},
    monthlyStats: {},
    topEntries: []
  };

  data.forEach((entry, index) => {
    if (typeof entry.value !== 'number' || isNaN(entry.value)) {
      throw new Error(`Entry ${index}: value must be a valid number, got ${entry.value}`);
    }
    if (typeof entry.category !== 'string' || !entry.category.trim()) {
      throw new Error(`Entry ${index}: category must be a non-empty string`);
    }
    if (typeof entry.date !== 'string' || !entry.date.trim()) {
      throw new Error(`Entry ${index}: date must be a non-empty string`);
    }

    const value = Number(entry.value);

    stats.totalValue += value;
    stats.minValue = Math.min(stats.minValue, value);
    stats.maxValue = Math.max(stats.maxValue, value);
    stats.uniqueCategories.add(entry.category);
    stats.uniqueIds.add(entry.id);

    if (!stats.categoryStats[entry.category]) {
      stats.categoryStats[entry.category] = {
        count: 0,
        totalValue: 0,
        averageValue: 0,
        minValue: Infinity,
        maxValue: -Infinity,
        entries: []
      };
    }
    stats.categoryStats[entry.category].count++;
    stats.categoryStats[entry.category].totalValue += value;
    stats.categoryStats[entry.category].minValue = Math.min(stats.categoryStats[entry.category].minValue, value);
    stats.categoryStats[entry.category].maxValue = Math.max(stats.categoryStats[entry.category].maxValue, value);
    stats.categoryStats[entry.category].entries.push(entry);

    const monthKey = entry.date.substring(0, 7);
    if (!stats.monthlyStats[monthKey]) {
      stats.monthlyStats[monthKey] = {
        count: 0,
        totalValue: 0,
        averageValue: 0
      };
    }
    stats.monthlyStats[monthKey].count++;
    stats.monthlyStats[monthKey].totalValue += value;

    if (!stats.dateRange.start || entry.date < stats.dateRange.start) {
      stats.dateRange.start = entry.date;
    }
    if (!stats.dateRange.end || entry.date > stats.dateRange.end) {
      stats.dateRange.end = entry.date;
    }
  });

  if (stats.totalEntries === 0) {
    throw new Error('Cannot calculate averages: no data entries');
  }
  stats.averageValue = stats.totalValue / stats.totalEntries;

  const sortedValues = data.map(e => e.value).sort((a, b) => a - b);
  const mid = Math.floor(sortedValues.length / 2);
  stats.medianValue = sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid];

  const variance = data.reduce((sum, entry) => {
    const diff = entry.value - stats.averageValue;
    return sum + (diff * diff);
  }, 0) / stats.totalEntries;
  stats.variance = variance;
  stats.standardDeviation = Math.sqrt(variance);

  const q1Index = Math.floor(sortedValues.length * 0.25);
  const q3Index = Math.floor(sortedValues.length * 0.75);
  stats.quartile1 = sortedValues[q1Index] || 0;
  stats.quartile3 = sortedValues[q3Index] || 0;
  stats.interquartileRange = stats.quartile3 - stats.quartile1;

  if (stats.minValue === Infinity) stats.minValue = 0;
  if (stats.maxValue === -Infinity) stats.maxValue = 0;

  Object.keys(stats.categoryStats).forEach(category => {
    const catStats = stats.categoryStats[category];
    if (catStats.count === 0) {
      throw new Error(`Category ${category} has zero count`);
    }
    catStats.averageValue = catStats.totalValue / catStats.count;

    const catSortedValues = catStats.entries.map(e => e.value).sort((a, b) => a - b);
    const catMid = Math.floor(catSortedValues.length / 2);
    catStats.medianValue = catSortedValues.length % 2 === 0
      ? (catSortedValues[catMid - 1] + catSortedValues[catMid]) / 2
      : catSortedValues[catMid];

    const catVariance = catStats.entries.reduce((sum, entry) => {
      const diff = entry.value - catStats.averageValue;
      return sum + (diff * diff);
    }, 0) / catStats.count;
    catStats.variance = catVariance;
    catStats.standardDeviation = Math.sqrt(catVariance);

    catStats.entries.sort((a, b) => b.value - a.value);

    if (catStats.minValue === Infinity) catStats.minValue = 0;
    if (catStats.maxValue === -Infinity) catStats.maxValue = 0;
  });

  Object.keys(stats.monthlyStats).forEach(month => {
    const monthStats = stats.monthlyStats[month];
    if (monthStats.count === 0) {
      throw new Error(`Month ${month} has zero count`);
    }
    monthStats.averageValue = monthStats.totalValue / monthStats.count;
  });

  stats.topEntries = data
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  stats.uniqueCategories = Array.from(stats.uniqueCategories).sort();
  stats.uniqueIds = Array.from(stats.uniqueIds).sort();

  stats.monthlyStats = Object.keys(stats.monthlyStats)
    .sort()
    .reduce((result, key) => {
      result[key] = stats.monthlyStats[key];
      return result;
    }, {});

  return stats;
}

module.exports = { processData };
