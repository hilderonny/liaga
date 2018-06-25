package hilderonny.liaga;

import android.app.Activity;
import android.location.Location;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class AndroidJavascriptInterface {

    private Activity mActivity;
    private String mPositionCallback = null;

    AndroidJavascriptInterface(Activity activity) {
        mActivity = activity;
    }

    private void executeJavascript(final String javascript) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ((WebView) mActivity.findViewById(R.id.webview)).evaluateJavascript("javascript:" + javascript, null);
            }
        });
    }

    @JavascriptInterface
    public void watchPosition(String callback) {
        Log.d("LIAGA", callback);
        mPositionCallback = callback;
        executeJavascript(callback + "(JSON.parse('{\"coords\":{\"latitude\":51,\"longitude\":11}}'));");
    }

    public void sendLocationToWebView(Location location) {
        if (mPositionCallback == null) return;
        executeJavascript(mPositionCallback + "(JSON.parse('{\"coords\":{\"latitude\":" + location.getLatitude() + ",\"longitude\":" + location.getLongitude() + "}}'));");
    }

}
