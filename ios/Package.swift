// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RivianSpotter",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "SpotterCore", targets: ["SpotterCore"]),
               .executable(name: "SpotterPreview", targets: ["SpotterApp"])],
    targets: [
        .target(name: "SpotterCore", resources: [.process("Resources")]),
        .executableTarget(name: "SpotterApp", dependencies: ["SpotterCore"]),
        .testTarget(name: "SpotterCoreTests", dependencies: ["SpotterCore"])
    ]
)
