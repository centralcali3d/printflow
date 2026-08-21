// swift-tools-version: 6.0
import PackageDescription

// PrintFlowCore — the ONE cost engine (plan §4).
//
// Pure computation, zero I/O: no networking, no database, no Foundation date
// formatting. That constraint is what makes it testable against golden files
// lifted from the live sheet, and it is why reports aggregate over the
// snapshots this package produces rather than recomputing them in SQL.
//
// Filled in during Stage 1. Do not add dependencies here without a reason
// that survives "could this be computed by the caller instead?"
let package = Package(
    name: "PrintFlowCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "PrintFlowCore", targets: ["PrintFlowCore"])
    ],
    targets: [
        .target(
            name: "PrintFlowCore",
            swiftSettings: [.swiftLanguageMode(.v6)]
        ),
        .testTarget(
            name: "PrintFlowCoreTests",
            dependencies: ["PrintFlowCore"],
            swiftSettings: [.swiftLanguageMode(.v6)]
        )
    ]
)
