const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    const reqBody = JSON.parse(event.body);
    
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // تحديث القيم الرسمية
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `Sheet1!E${reqBody.rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          reqBody.officialVideos,
          reqBody.officialHours,
          (reqBody.officialVideos / reqBody.officialHours).toFixed(2)
        ]]
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "تم حفظ البيانات الرسمية" })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
