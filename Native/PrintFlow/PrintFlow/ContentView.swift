import SwiftUI

struct ContentView: View {
    @AppStorage("scriptURL") private var scriptURL = AppConfig.defaultScriptURL

    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var isSettingsPresented = false
    @State private var reloadToken = UUID()

    var body: some View {
        ZStack {
            PrintFlowWebView(
                url: AppConfig.printFlowURL,
                scriptURL: scriptURL,
                isLoading: $isLoading,
                errorMessage: $errorMessage
            )
            .id(reloadToken)

            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button {
                        isSettingsPresented = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(.ultraThinMaterial, in: Circle())
                            .overlay(Circle().strokeBorder(.white.opacity(0.14)))
                            .shadow(radius: 5, y: 2)
                    }
                    .accessibilityLabel("Native settings")
                    .padding(10)
                }
            }

            if isLoading {
                LoadingOverlay()
            }

            if let errorMessage {
                ErrorOverlay(message: errorMessage) {
                    self.errorMessage = nil
                    isLoading = true
                }
            }
        }
        .sheet(isPresented: $isSettingsPresented) {
            SettingsView(scriptURL: $scriptURL) {
                reloadWebView()
            }
        }
    }

    private func reloadWebView() {
        errorMessage = nil
        isLoading = true
        reloadToken = UUID()
    }
}

private struct LoadingOverlay: View {
    var body: some View {
        VStack(spacing: 14) {
            ProgressView()
                .tint(.white)
                .scaleEffect(1.15)
            Text("PrintFlow")
                .font(.system(.title3, design: .rounded).weight(.bold))
            Text("Loading business dashboard")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.055, green: 0.059, blue: 0.067))
    }
}

private struct ErrorOverlay: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("PrintFlow")
                .font(.system(.title2, design: .rounded).weight(.bold))
            Text(message)
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Try Again", action: retry)
                .buttonStyle(.borderedProminent)
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

#Preview {
    ContentView()
}
