import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

/**
 * Generate full farmer report with all data
 */
export async function generateFullFarmerReport(farmerData, reportData, t) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

  // Cover Page
  doc.setFontSize(24);
  doc.setTextColor(34, 197, 94); // Primary green color
  doc.text('FarmIQ', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('Farmer Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  doc.setFontSize(12);
  doc.text(`Farmer: ${farmerData.name || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.text(`Location: ${farmerData.location || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.text(`Farming Type: ${farmerData.farmingType || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  doc.addPage();

  // Executive Summary
  yPosition = 20;
  doc.setFontSize(16);
  doc.text('Executive Summary', 20, yPosition);
  
  yPosition += 10;
  doc.setFontSize(11);
  const fieldsCount = Array.isArray(reportData.fields) ? reportData.fields.length : 0;
  const advisoriesCount = Array.isArray(reportData.advisories) ? reportData.advisories.length : 0;
  const activeFieldsCount = Array.isArray(reportData.fields) 
    ? reportData.fields.filter(f => f && f.sensorData && Array.isArray(f.sensorData) && f.sensorData.length > 0).length 
    : 0;
  
  const summaryData = [
    ['Total Fields', String(fieldsCount)],
    ['Total Advisories', String(advisoriesCount)],
    ['Active Fields', String(activeFieldsCount)],
  ];
  
  if (summaryData.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
    });

    yPosition = (doc.lastAutoTable?.finalY || yPosition) + 15;
  } else {
    yPosition += 20;
  }

  // Fields Overview
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(16);
  doc.text('Fields Overview', 20, yPosition);
  
  yPosition += 10;
  const fieldsTableData = Array.isArray(reportData.fields) 
    ? reportData.fields.map(field => [
        String(field?.name || 'N/A'),
        String(field?.cropName || 'N/A'),
        String(field?.cropStage || 'N/A'),
        String(field?.location || 'N/A'),
      ])
    : [];
  
  if (fieldsTableData.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['Field Name', 'Crop', 'Stage', 'Location']],
      body: fieldsTableData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
    });

    yPosition = (doc.lastAutoTable?.finalY || yPosition) + 15;
  } else {
    doc.setFontSize(11);
    doc.text('No fields data available', 20, yPosition);
    yPosition += 15;
  }

  // Date-wise Data
  const dateWiseData = Array.isArray(reportData.dateWiseData) ? reportData.dateWiseData : [];
  
  if (dateWiseData.length === 0) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(12);
    doc.text('No date-wise data available', 20, yPosition);
    yPosition += 15;
  }
  
  dateWiseData.forEach((dayData, index) => {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }
    
    yPosition += 15;
    doc.setFontSize(14);
    doc.text(`Date: ${dayData.date}`, 20, yPosition);
    
    yPosition += 10;
    
    // Sensor readings for the day
    Object.keys(dayData.fields || {}).forEach(fieldId => {
      const fieldData = dayData.fields[fieldId];
      if (fieldData.sensorReadings && fieldData.sensorReadings.length > 0) {
        const latestReading = fieldData.sensorReadings[fieldData.sensorReadings.length - 1];
        
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.text(`Field: ${fieldData.fieldName}`, 20, yPosition);
        
        yPosition += 8;
        const sensorTableData = [
          ['Air Temperature', `${latestReading.air_temp?.toFixed(1) || 'N/A'}°C`],
          ['Air Humidity', `${latestReading.air_humidity?.toFixed(1) || 'N/A'}%`],
          ['Soil Moisture', `${latestReading.soil_moisture?.toFixed(1) || 'N/A'}%`],
          ['Soil Temperature', `${latestReading.soil_temp?.toFixed(1) || 'N/A'}°C`],
          ['Light Intensity', `${latestReading.light_lux?.toFixed(0) || 'N/A'} lux`],
          ['Wind Speed', `${latestReading.wind_speed?.toFixed(1) || 'N/A'} km/h`],
        ];
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Parameter', 'Value']],
          body: sensorTableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
        
        yPosition = (doc.lastAutoTable?.finalY || yPosition) + 10;
      }
    });
    
    // Advisories for the day
    if (dayData.advisories && dayData.advisories.length > 0) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(12);
      doc.text('Advisories:', 20, yPosition);
      yPosition += 8;
      
      const advisoryTableData = dayData.advisories.flatMap(adv => 
        adv.recommendations.map(rec => [
          adv.field_name || 'N/A',
          rec.type || 'N/A',
          rec.status || 'N/A',
          rec.message || 'N/A',
        ])
      );
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Field', 'Type', 'Status', 'Message']],
        body: advisoryTableData,
        theme: 'striped',
        headStyles: { fillColor: [168, 85, 247] },
      });
      
      yPosition = (doc.lastAutoTable?.finalY || yPosition) + 15;
    }
  });

  // Statistics
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(16);
  doc.text('Statistics', 20, yPosition);
  
  yPosition += 10;
  
  // Calculate averages
  const allSensorReadings = Array.isArray(reportData.fields)
    ? reportData.fields.flatMap(f => (f && Array.isArray(f.sensorData)) ? f.sensorData : [])
    : [];
    
  if (allSensorReadings.length > 0) {
    const validReadings = allSensorReadings.filter(r => r && typeof r === 'object');
    if (validReadings.length > 0) {
      const avgTemp = validReadings.reduce((sum, r) => sum + (parseFloat(r.air_temp) || 0), 0) / validReadings.length;
      const avgHumidity = validReadings.reduce((sum, r) => sum + (parseFloat(r.air_humidity) || 0), 0) / validReadings.length;
      const avgSoilMoisture = validReadings.reduce((sum, r) => sum + (parseFloat(r.soil_moisture) || 0), 0) / validReadings.length;
      
      const statsData = [
        ['Average Air Temperature', `${avgTemp.toFixed(1)}°C`],
        ['Average Air Humidity', `${avgHumidity.toFixed(1)}%`],
        ['Average Soil Moisture', `${avgSoilMoisture.toFixed(1)}%`],
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
      });
      
      yPosition = (doc.lastAutoTable?.finalY || yPosition) + 15;
    } else {
      doc.setFontSize(11);
      doc.text('No valid sensor readings available for statistics', 20, yPosition);
      yPosition += 15;
    }
  } else {
    doc.setFontSize(11);
    doc.text('No sensor data available for statistics', 20, yPosition);
    yPosition += 15;
  }

    // Save PDF
    const fileName = `Farmer_Report_${(farmerData.name || 'Report').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating full farmer report:', error);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

/**
 * Generate graphs report
 */
export async function generateGraphsReport(fieldName, chartElements, t) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.text(`${fieldName} - Graphs Report`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;

  // Convert each chart to image and add to PDF
  for (let i = 0; i < chartElements.length; i++) {
    if (i > 0) {
      doc.addPage();
      yPosition = 20;
    }
    
    try {
      const canvas = await html2canvas(chartElements[i], {
        scale: 2,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (yPosition + imgHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (err) {
      console.error('Failed to capture chart:', err);
    }
  }

  const fileName = `${fieldName}_Graphs_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Generate recommendations report
 */
export async function generateRecommendationsReport(fieldName, recommendationsData, t) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.text(`${fieldName} - Recommendations Report`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  doc.setFontSize(14);
  doc.text(`Crop Stage: ${recommendationsData.crop_stage || 'N/A'}`, 20, yPosition);
  
  yPosition += 10;
  doc.text(`GDD Value: ${recommendationsData.gdd_value?.toFixed(1) || 'N/A'}`, 20, yPosition);
  
  yPosition += 15;
  
  const recommendations = recommendationsData.recommendations || [];
  const tableData = recommendations.map(rec => [
    rec.title || 'N/A',
    rec.status || 'N/A',
    rec.description || 'N/A',
    rec.timing || 'N/A',
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Title', 'Status', 'Description', 'Timing']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] },
  });
  
  yPosition = doc.lastAutoTable.finalY + 15;
  
  if (recommendationsData.ai_reasoning_text) {
    doc.setFontSize(12);
    doc.text('AI Reasoning:', 20, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(recommendationsData.ai_reasoning_text, pageWidth - 40);
    doc.text(splitText, 20, yPosition);
  }

  const fileName = `${fieldName}_Recommendations_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Generate advisories report
 */
export async function generateAdvisoriesReport(advisories, t) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.text('Advisory History Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;

  advisories.forEach((advisory, index) => {
    if (index > 0) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.text(`Field: ${advisory.field_name || 'N/A'}`, 20, yPosition);
    
    yPosition += 8;
    doc.setFontSize(11);
    doc.text(`Date: ${new Date(advisory.date).toLocaleDateString()}`, 20, yPosition);
    
    yPosition += 15;
    
    const recommendations = advisory.recommendations || [];
    const tableData = recommendations.map(rec => [
      rec.type || 'N/A',
      rec.status || 'N/A',
      rec.message || 'N/A',
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Type', 'Status', 'Message']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [168, 85, 247] },
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
  });

  const fileName = `Advisories_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Generate weather report
 */
export async function generateWeatherReport(location, weatherData, t) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.text(`Weather Report - ${location}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Current Weather
  doc.setFontSize(14);
  doc.text('Current Weather', 20, yPosition);
  
  yPosition += 10;
  const currentData = [
    ['Temperature', `${weatherData.current?.temperature || 'N/A'}°C`],
    ['Humidity', `${weatherData.current?.humidity || 'N/A'}%`],
    ['Wind Speed', `${weatherData.current?.windSpeed || 'N/A'} km/h`],
    ['Conditions', weatherData.current?.conditions || 'N/A'],
  ];
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Parameter', 'Value']],
    body: currentData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  yPosition = doc.lastAutoTable.finalY + 15;
  
  // Forecast
  if (weatherData.forecast && weatherData.forecast.length > 0) {
    doc.setFontSize(14);
    doc.text('Forecast', 20, yPosition);
    
    yPosition += 10;
    const forecastData = weatherData.forecast.map(item => [
      item.time || 'N/A',
      `${item.temperature || 'N/A'}°C`,
      item.conditions || 'N/A',
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Time', 'Temperature', 'Conditions']],
      body: forecastData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
  }
  
  // Alerts
  if (weatherData.alerts && weatherData.alerts.length > 0) {
    doc.setFontSize(14);
    doc.text('Weather Alerts', 20, yPosition);
    
    yPosition += 10;
    const alertsData = weatherData.alerts.map(alert => [
      alert.type || 'N/A',
      alert.title || 'N/A',
      alert.message || 'N/A',
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Type', 'Title', 'Message']],
      body: alertsData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
    });
  }

  const fileName = `Weather_Report_${location}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

