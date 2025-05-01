const { google } = require('googleapis');
const sheets = google.sheets('v4');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    
    // إعداد المصادقة
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = await auth.getClient();
    
    // تحديث البيانات
    const response = await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          new Date().toISOString(),
          body.videosLogged,
          (body.totalSeconds / 3600).toFixed(2),
          body.vacationMode ? 'Yes' : 'No'
        ]]
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "تمت المزامنة بنجاح" })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
