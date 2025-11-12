let XLSX;
try {
  XLSX = require('xlsx');
} catch (error) {
  XLSX = null;
}

function generateSpreadsheet({ data, stats, reportTitle }) {
  if (!XLSX) {
    throw new Error('xlsx module not available. Please install dependencies with: npm install');
  }

  const workbook = XLSX.utils.book_new();

  const rawDataSheet = [
    ['Report Title:', reportTitle],
    ['Generated:', new Date().toISOString()],
    ['Total Entries:', stats.totalEntries],
    ['Date Range:', `${stats.dateRange.start} to ${stats.dateRange.end}`],
    [''],
    ['ID', 'Name', 'Value', 'Category', 'Date']
  ];

  data.forEach(entry => {
    rawDataSheet.push([
      entry.id,
      entry.name,
      entry.value,
      entry.category,
      entry.date
    ]);
  });

  const rawDataWS = XLSX.utils.aoa_to_sheet(rawDataSheet);
  XLSX.utils.book_append_sheet(workbook, rawDataWS, 'Raw Data');

  const summarySheet = [
    ['Summary Statistics'],
    [''],
    ['Basic Statistics'],
    ['Total Entries', stats.totalEntries],
    ['Sum (Total Value)', stats.totalValue],
    ['Average (Mean)', stats.averageValue],
    ['Median', stats.medianValue],
    ['Minimum Value', stats.minValue],
    ['Maximum Value', stats.maxValue],
    [''],
    ['Statistical Measures'],
    ['Standard Deviation', stats.standardDeviation],
    ['Variance', stats.variance],
    ['Quartile 1 (Q1)', stats.quartile1],
    ['Quartile 3 (Q3)', stats.quartile3],
    ['Interquartile Range (IQR)', stats.interquartileRange],
    [''],
    ['Other Information'],
    ['Unique Categories', stats.uniqueCategories.length],
    ['Unique IDs', stats.uniqueIds.length],
    ['Date Range Start', stats.dateRange.start],
    ['Date Range End', stats.dateRange.end],
    [''],
    ['Top 10 Entries by Value'],
    [''],
    ['Rank', 'ID', 'Name', 'Value', 'Category', 'Date']
  ];

  stats.topEntries.forEach((entry, index) => {
    summarySheet.push([
      index + 1,
      entry.id,
      entry.name,
      entry.value,
      entry.category,
      entry.date
    ]);
  });

  const summaryWS = XLSX.utils.aoa_to_sheet(summarySheet);
  XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');

  const categorySheet = [
    ['Category Breakdown'],
    [''],
    ['Category', 'Count', 'Sum', 'Average', 'Median', 'Min', 'Max', 'Std Dev', 'Variance']
  ];

  Object.keys(stats.categoryStats).forEach(category => {
    const catStats = stats.categoryStats[category];
    categorySheet.push([
      category,
      catStats.count,
      catStats.totalValue,
      catStats.averageValue,
      catStats.medianValue,
      catStats.minValue,
      catStats.maxValue,
      catStats.standardDeviation,
      catStats.variance
    ]);
  });

  const categoryWS = XLSX.utils.aoa_to_sheet(categorySheet);
  XLSX.utils.book_append_sheet(workbook, categoryWS, 'Categories');

  const monthlySheet = [
    ['Monthly Trends'],
    [''],
    ['Month', 'Count', 'Sum', 'Average']
  ];

  Object.keys(stats.monthlyStats).forEach(month => {
    const monthStats = stats.monthlyStats[month];
    monthlySheet.push([
      month,
      monthStats.count,
      monthStats.totalValue,
      monthStats.averageValue
    ]);
  });

  const monthlyWS = XLSX.utils.aoa_to_sheet(monthlySheet);
  XLSX.utils.book_append_sheet(workbook, monthlyWS, 'Monthly Trends');

  Object.keys(stats.categoryStats).forEach(category => {
    const catStats = stats.categoryStats[category];
    const categoryDetailSheet = [
      [`Category: ${category}`],
      [''],
      ['Statistics'],
      ['Total Entries', catStats.count],
      ['Sum (Total Value)', catStats.totalValue],
      ['Average (Mean)', catStats.averageValue],
      ['Median', catStats.medianValue],
      ['Minimum', catStats.minValue],
      ['Maximum', catStats.maxValue],
      ['Standard Deviation', catStats.standardDeviation],
      ['Variance', catStats.variance],
      [''],
      ['Top Entries in this Category'],
      [''],
      ['ID', 'Name', 'Value', 'Date']
    ];

    const topCategoryEntries = catStats.entries
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    topCategoryEntries.forEach(entry => {
      categoryDetailSheet.push([
        entry.id,
        entry.name,
        entry.value,
        entry.date
      ]);
    });

    const categoryDetailWS = XLSX.utils.aoa_to_sheet(categoryDetailSheet);
    const sheetName = category.length > 25 ? category.substring(0, 25) + '...' : category;
    XLSX.utils.book_append_sheet(workbook, categoryDetailWS, sheetName);
  });

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

module.exports = { generateSpreadsheet };
