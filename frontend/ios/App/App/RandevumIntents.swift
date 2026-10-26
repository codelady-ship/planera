import AppIntents
import UIKit

// Siri shortcuts (#66): "Hey Siri, Randevum-a qeyd et" opens the new-note
// flow through the app's URL scheme, which the web layer turns into the
// diary with the wizard open (features/mobile/deep-links.ts).

@available(iOS 16.0, *)
struct NewNoteIntent: AppIntent {
    static var title: LocalizedStringResource = "Randevum-a qeyd et"
    static var description = IntentDescription("Yeni qeyd üçün təqvimi açır")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "randevum://reminder/new") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct RandevumShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: NewNoteIntent(),
            phrases: [
                "\(.applicationName)-a qeyd et",
                "\(.applicationName) yeni qeyd",
                "Add a note in \(.applicationName)",
            ],
            shortTitle: "Yeni qeyd",
            systemImageName: "note.text.badge.plus"
        )
    }
}
