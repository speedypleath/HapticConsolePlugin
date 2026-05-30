#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>
#include "PluginProcessor.h"

namespace HapticConsole
{

class HapticConsoleEditor : public juce::AudioProcessorEditor
{
public:
    explicit HapticConsoleEditor(HapticConsoleProcessor&);
    ~HapticConsoleEditor() override;

    void resized() override;

    void pushParamToUI(const juce::String& paramId, float value);
    void onMidiLearnResult(const juce::String& paramId, int cc);

private:
    struct ParamListener : juce::AudioProcessorValueTreeState::Listener
    {
        ParamListener(HapticConsoleEditor& e, juce::String id)
            : editor(e), paramId(std::move(id)) {}

        void parameterChanged(const juce::String&, float v) override
        {
            juce::Component::SafePointer<HapticConsoleEditor> safe(&editor);
            juce::MessageManager::callAsync([safe, id = paramId, v]
            {
                if (auto* e = safe.getComponent())
                    e->pushParamToUI(id, v);
            });
        }

        HapticConsoleEditor& editor;
        juce::String paramId;
    };

    HapticConsoleProcessor& hapticProcessor;
    std::unique_ptr<juce::WebBrowserComponent> webView;
    std::vector<std::unique_ptr<ParamListener>> listeners;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(HapticConsoleEditor)
};

} // namespace HapticConsole
