const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const minify = require('html-minifier').minify;

function formatNumber(num) {
    if (typeof num !== 'number') return num;
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function minifyHTML(html) {
    return minify(html, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
        removeEmptyAttributes: true,
        removeOptionalTags: false,
        caseSensitive: false,
        conservativeCollapse: false,
        decodeEntities: true
    });
}

async function generateHTMLReport({ stats, reportTitle }) {
    let templatePath;
    if (fs.existsSync(path.join(__dirname, 'templates', 'report.ejs'))) {
        templatePath = path.join(__dirname, 'templates', 'report.ejs');
    } else if (fs.existsSync('/var/task/templates/report.ejs')) {
        templatePath = '/var/task/templates/report.ejs';
    } else {
        templatePath = path.join(process.cwd(), 'build', 'templates', 'report.ejs');
    }

    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found at: ${templatePath}`);
    }

    const categoryLabels = Object.keys(stats.categoryStats);
    const categoryValues = Object.values(stats.categoryStats).map(cat => cat.totalValue);

    const monthlyLabels = Object.keys(stats.monthlyStats);
    const monthlyValues = Object.values(stats.monthlyStats).map(month => month.totalValue);
    const monthlyCounts = Object.values(stats.monthlyStats).map(month => month.count);

    const topEntryLabels = stats.topEntries.map(entry => entry.name.length > 15 ? entry.name.substring(0, 15) + '...' : entry.name);
    const topEntryValues = stats.topEntries.map(entry => entry.value);

    const templateData = {
        reportTitle: reportTitle || '',
        stats,
        formatNumber,
        chartData: {
            categoryLabels: categoryLabels || [],
            categoryValues: categoryValues || [],
            monthlyLabels: monthlyLabels || [],
            monthlyValues: monthlyValues || [],
            monthlyCounts: monthlyCounts || [],
            topEntryLabels: topEntryLabels || [],
            topEntryValues: topEntryValues || []
        }
    };

    try {
        let html = await ejs.renderFile(templatePath, templateData, {
            async: false
        });
        html = minifyHTML(html);
        return Buffer.from(html, 'utf8');
    } catch (error) {
        throw new Error(`Failed to generate HTML report: ${error.message}`);
    }
}

module.exports = { generateHTMLReport };
