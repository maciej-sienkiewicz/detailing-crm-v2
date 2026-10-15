import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AppContainerViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/**
 * Widok strony pod paskiem stanu, nie za nim - tak jak w aplikacji dodanej do ekranu
 * początkowego, pod którą strona jest dopracowana. Na dole widok sięga krawędzi, a stronę
 * odsuwa od paska Home jej własne env(safe-area-inset-bottom), także jak tam.
 *
 * CAPBridgeViewController jest sam widokiem strony (loadView: view = webView), więc
 * odsunięcie od góry wymaga kontenera wokół niego.
 */
class AppContainerViewController: UIViewController {
    private let bridgeController = CAPBridgeViewController()

    override func viewDidLoad() {
        super.viewDidLoad()
        // Pas pod paskiem stanu - granat jak theme-color strony i ekran startowy.
        view.backgroundColor = UIColor(red: 15 / 255, green: 23 / 255, blue: 42 / 255, alpha: 1)

        addChild(bridgeController)
        let content = bridgeController.view!
        content.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(content)
        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            content.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            content.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            content.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        bridgeController.didMove(toParent: self)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
}
