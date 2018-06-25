package hilderonny.liaga;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.http.SslError;
import android.os.Bundle;
import android.util.Log;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity implements LocationListener {

    private AndroidJavascriptInterface mJavascriptInterface = null;

    @SuppressLint({"SetJavaScriptEnabled", "MissingPermission"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        // Setup webview
        WebView webView = findViewById(R.id.webview);
        WebView.setWebContentsDebuggingEnabled(true);
        // Javascript interface listens on "Android" javascript property
        mJavascriptInterface = new AndroidJavascriptInterface(this);
        webView.addJavascriptInterface(mJavascriptInterface, "Android");
        // Settings
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        // Enable geolocation
        //webSettings.setGeolocationEnabled(true);
        LocationManager locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (locationManager != null) locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                3000, // Only once every 3 seconds
                2, // Only when position changed about 2 meters
                this);
        // Enable localstorage
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            // Need to override SSL handling for allowing access to untrusted certificates
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.proceed();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            // Need to accept permissions to use the camera and audio
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        WebView webView = findViewById(R.id.webview);
        webView.loadUrl("https://liaga.glitch.me");
    }

    @Override
    public void onLocationChanged(Location location) {
        Log.d("LIAGA", "onLocationChanged");
        if (mJavascriptInterface == null) return;
        mJavascriptInterface.sendLocationToWebView(location);
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}
}
