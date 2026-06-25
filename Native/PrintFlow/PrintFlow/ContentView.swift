import SwiftUI

struct ContentView: View {
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            PrintFlowWebView(
                url: AppConfig.printFlowURL,
                defaultScriptURL: AppConfig.defaultScriptURL,
                isLoading: $isLoading,
                errorMessage: $errorMessage
            )

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
