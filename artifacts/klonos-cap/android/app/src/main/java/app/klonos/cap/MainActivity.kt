// MainActivity.kt — ZeroLag Capacitor Shell
// Extends BridgeActivity (Capacitor's WebView bridge)
// Registers KlonosCallosumPlugin so JS can call Callosum + Cerebelo.

package app.klonos.cap

import com.getcapacitor.BridgeActivity
import com.klonos.callosum.KlonosCallosumPlugin

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        // Register native plugins BEFORE super.onCreate()
        registerPlugin(KlonosCallosumPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
