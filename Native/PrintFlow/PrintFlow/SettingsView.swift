import SwiftUI

struct SettingsView: View {
    @Binding var scriptURL: String
    let reloadWebView: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var draftScriptURL: String
    @State private var validationMessage: String?

    init(scriptURL: Binding<String>, reloadWebView: @escaping () -> Void) {
        _scriptURL = scriptURL
        self.reloadWebView = reloadWebView
        _draftScriptURL = State(initialValue: scriptURL.wrappedValue)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Backend") {
                    TextField("Apps Script /exec URL", text: $draftScriptURL, axis: .vertical)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .lineLimit(3...5)

                    if let validationMessage {
                        Text(validationMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Button("Save and Reload") {
                        saveAndReload()
                    }

                    Button("Reset to Current Deployment") {
                        draftScriptURL = AppConfig.defaultScriptURL
                        saveAndReload()
                    }
                }

                Section("Web App") {
                    LabeledContent("URL", value: AppConfig.printFlowURL.absoluteString)
                    Button("Reload PrintFlow") {
                        reloadWebView()
                        dismiss()
                    }
                }

                Section("App") {
                    LabeledContent("Bundle", value: Bundle.main.bundleIdentifier ?? "Unknown")
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                }
            }
            .navigationTitle("PrintFlow Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func saveAndReload() {
        let trimmed = draftScriptURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard isValidScriptURL(trimmed) else {
            validationMessage = "Use a full Apps Script HTTPS URL ending in /exec."
            return
        }

        validationMessage = nil
        scriptURL = trimmed
        reloadWebView()
        dismiss()
    }

    private func isValidScriptURL(_ value: String) -> Bool {
        guard let url = URL(string: value),
              url.scheme == "https",
              url.host?.contains("script.google.com") == true
        else { return false }

        return url.path.hasSuffix("/exec")
    }
}

#Preview {
    SettingsView(scriptURL: .constant(AppConfig.defaultScriptURL)) {}
}
