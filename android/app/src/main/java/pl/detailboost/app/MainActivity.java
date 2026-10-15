package pl.detailboost.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Kolor pasków systemowych - ten sam granat co theme-color strony i ekran startowy. */
    private static final int BAR_COLOR = Color.parseColor("#0f172a");

    /**
     * Od Androida 15 aplikacja rysuje się pod paskiem stanu i nawigacji. Strona jest
     * dopracowana pod układ przeglądarki i aplikacji z ekranu początkowego, w których
     * paski systemowe NIE zachodzą na treść - więc odsuwamy widok strony od pasków
     * (i od klawiatury, która przy rysowaniu pod paskami przestaje sama skracać okno).
     * Strona dostaje wtedy zwykły prostokąt, a env(safe-area-inset-*) wynosi 0.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        View container = (View) getBridge().getWebView().getParent();
        container.setBackgroundColor(BAR_COLOR);

        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);

        ViewCompat.setOnApplyWindowInsetsListener(container, (view, insets) -> {
            Insets system = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(system.left, system.top, system.right, Math.max(system.bottom, keyboard.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
