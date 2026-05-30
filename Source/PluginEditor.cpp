#include "PluginEditor.h"
#include "Parameters.h"

namespace HapticConsole
{

static constexpr const char* kDevServerUrl = "http://localhost:5173";

HapticConsoleEditor::HapticConsoleEditor(HapticConsoleProcessor& p)
    : AudioProcessorEditor(p), hapticProcessor(p)
{
    auto options = juce::WebBrowserComponent::Options{}
        .withNativeIntegrationEnabled()
        .withNativeFunction("setMapping",
            [this](const juce::Array<juce::var>& args,
                   juce::WebBrowserComponent::NativeFunctionCompletion complete)
            {
                if (args.size() >= 2)
                    hapticProcessor.midiMapper.setMapping(static_cast<int>(args[0]),
                                                    args[1].toString());
                complete({});
            })
        .withResourceProvider(
            [](const juce::String&) -> std::optional<juce::WebBrowserComponent::Resource>
            {
                return std::nullopt; // populate with BinaryData for release builds
            },
            juce::URL(kDevServerUrl).getOrigin());

    webView = std::make_unique<juce::WebBrowserComponent>(options);
    addAndMakeVisible(*webView);

#if JUCE_DEBUG
    webView->goToURL(kDevServerUrl);
#else
    webView->goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
#endif

    for (const auto* id : { ParamID::flywheelVelocity, ParamID::flywheelDirection,
                             ParamID::pneumaticPressure,
                             ParamID::springTension,    ParamID::springAcoustic,
                             ParamID::leanTotal,        ParamID::leanBalance,
                             ParamID::matrixCentroidX,  ParamID::matrixCentroidY,
                             ParamID::matrixPressure,
                             ParamID::joystick1X,       ParamID::joystick1Y,
                             ParamID::joystick2X,       ParamID::joystick2Y })
    {
        auto listener = std::make_unique<ParamListener>(*this, id);
        hapticProcessor.apvts.addParameterListener(id, listener.get());
        listeners.push_back(std::move(listener));
    }

    setSize(640, 500);
}

HapticConsoleEditor::~HapticConsoleEditor()
{
    for (auto& l : listeners)
        hapticProcessor.apvts.removeParameterListener(l->paramId, l.get());
}

void HapticConsoleEditor::resized()
{
    webView->setBounds(getLocalBounds());
}

void HapticConsoleEditor::pushParamToUI(const juce::String& paramId, float value)
{
    webView->evaluateJavascript(
        "window.haptic?.onParamChange('" + paramId + "', " + juce::String(value, 6) + ")");
}

} // namespace HapticConsole
