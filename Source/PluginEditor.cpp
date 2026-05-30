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
        .withNativeFunction("startMidiLearn",
            [this](const juce::Array<juce::var>& args,
                   juce::WebBrowserComponent::NativeFunctionCompletion complete)
            {
                if (args.size() >= 1)
                    hapticProcessor.startMidiLearn(args[0].toString());
                complete({});
            })
        .withNativeFunction("getMappings",
            [this](const juce::Array<juce::var>&,
                   juce::WebBrowserComponent::NativeFunctionCompletion complete)
            {
                juce::DynamicObject::Ptr root = new juce::DynamicObject();

                // MIDI map: { "1": "flywheel_velocity", ... }
                juce::DynamicObject::Ptr midiObj = new juce::DynamicObject();
                for (const auto& [cc, pid] : hapticProcessor.midiMapper.getMap())
                    midiObj->setProperty(juce::String(cc), pid);
                root->setProperty("midi", juce::var(midiObj.get()));

                // OSC: { port: 8000, addresses: { "/haptic/...": "param_id", ... } }
                juce::DynamicObject::Ptr oscObj  = new juce::DynamicObject();
                juce::DynamicObject::Ptr addrObj = new juce::DynamicObject();
                for (const auto& [addr, pid] : hapticProcessor.oscMapper.getAddresses())
                    addrObj->setProperty(juce::String(addr), juce::String(pid));
                oscObj->setProperty("port",      hapticProcessor.oscMapper.getPort());
                oscObj->setProperty("addresses", juce::var(addrObj.get()));
                root->setProperty("osc", juce::var(oscObj.get()));

                complete(juce::var(root.get()));
            })
        .withNativeFunction("setOscMapping",
            [this](const juce::Array<juce::var>& args,
                   juce::WebBrowserComponent::NativeFunctionCompletion complete)
            {
                if (args.size() >= 2)
                    hapticProcessor.oscMapper.setAddress(args[0].toString(),
                                                         args[1].toString());
                complete({});
            })
        .withNativeFunction("setOscPort",
            [this](const juce::Array<juce::var>& args,
                   juce::WebBrowserComponent::NativeFunctionCompletion complete)
            {
                if (args.size() >= 1)
                    hapticProcessor.oscMapper.setPort(static_cast<int>(args[0]));
                complete({});
            })
        .withResourceProvider(
            [](const juce::String&) -> std::optional<juce::WebBrowserComponent::Resource>
            {
                return std::nullopt;
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

    {
        juce::ScopedLock sl(hapticProcessor.learnCallbackLock);
        juce::Component::SafePointer<HapticConsoleEditor> safe(this);
        hapticProcessor.onLearnComplete = [safe](const juce::String& paramId, int cc)
        {
            if (auto* e = safe.getComponent())
                e->onMidiLearnResult(paramId, cc);
        };
    }

    setSize(640, 500);
}

HapticConsoleEditor::~HapticConsoleEditor()
{
    {
        juce::ScopedLock sl(hapticProcessor.learnCallbackLock);
        hapticProcessor.onLearnComplete = nullptr;
    }

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

void HapticConsoleEditor::onMidiLearnResult(const juce::String& paramId, int cc)
{
    webView->evaluateJavascript(
        "window.haptic?.onMidiLearnComplete('" + paramId + "', " + juce::String(cc) + ")");
}

} // namespace HapticConsole
