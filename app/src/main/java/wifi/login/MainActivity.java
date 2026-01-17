package wifi.login;

import android.app.Activity;
import android.os.Bundle;
import android.util.TypedValue;
import android.widget.TextView;

import org.xmlpull.v1.XmlPullParser;
import org.xmlpull.v1.XmlPullParserFactory;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.StringReader;
import java.net.URL;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);

        final TextView tv = new TextView(this);
        tv.setText("Connecting...");
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 25);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        tv.setPadding(pad, pad, pad, pad);
        setContentView(tv);

        new Thread(() -> {
            String result;
            try {
                URL url = new URL("https://10.100.1.1:8090/login.xml");
                HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();

                // --- INSECURE: trust all certs + disable hostname verification (testing only) ---
                SSLContext sc = SSLContext.getInstance("TLS");
                sc.init(null, new TrustManager[]{new X509TrustManager() {
                    @Override public void checkClientTrusted(X509Certificate[] chain, String authType) { }
                    @Override public void checkServerTrusted(X509Certificate[] chain, String authType) { }
                    @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                }}, new SecureRandom());
                conn.setSSLSocketFactory(sc.getSocketFactory());
                conn.setHostnameVerifier(new HostnameVerifier() {
                    @Override public boolean verify(String hostname, SSLSession session) { return true; }
                });
                // ------------------------------------------------------------------------------

                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

                String payload = "mode=191&username=rakesh&password=rakesh&a=1768662579596&producttype=0";
                byte[] data = payload.getBytes("UTF-8");
                conn.setFixedLengthStreamingMode(data.length);

                OutputStream os = conn.getOutputStream();
                os.write(data);
                os.flush();
                os.close();

                int code = conn.getResponseCode();
                InputStream is = (code >= 200 && code < 400) ? conn.getInputStream() : conn.getErrorStream();

                BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"));
                StringBuilder bodySb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) bodySb.append(line).append('\n');
                br.close();
                conn.disconnect();

                String body = bodySb.toString();

                String msg = parseFirstTagText(body, "message"); // e.g. "You are signed in as [username]."
                boolean ok = (code >= 200 && code < 400) && isLoginSuccessful(msg);

                if (ok) {
                    result = "Login successful";
                    finish();
                } else if (msg != null && msg.length() > 0) {
                    result = msg;
                } else {
                    result = "HTTP " + code + "\n\n" + body;
                }

            } catch (Exception e) {
                if (e instanceof java.net.SocketTimeoutException) {
                    result = "Request timeout";
                } else {
                    result = e.toString();
                }
            }

            final String show = result;
            runOnUiThread(() -> tv.setText(show));
        }).start();
    }

    private static boolean isLoginSuccessful(String message) {
        if (message == null) return false;
        String m = message.toLowerCase();
        return m.contains("success") || m.contains("signed in");
    }

    // Minimal XML extraction: gets the text inside the first <tagName>...</tagName>
    private static String parseFirstTagText(String xml, String tagName) throws Exception {
        XmlPullParserFactory factory = XmlPullParserFactory.newInstance();
        factory.setNamespaceAware(false);
        XmlPullParser parser = factory.newPullParser();
        parser.setInput(new StringReader(xml));

        int event = parser.getEventType();
        while (event != XmlPullParser.END_DOCUMENT) {
            if (event == XmlPullParser.START_TAG && tagName.equals(parser.getName())) {
                return parser.nextText(); // handles CDATA too
            }
            event = parser.next();
        }
        return null;
    }
}