#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include "MidiMapper.h"

namespace HapticConsole
{

class HapticConsoleProcessor : public juce::AudioProcessor
{
public:
    HapticConsoleProcessor();
    ~HapticConsoleProcessor() override = default;

    void prepareToPlay(double, int) override {}
    void releaseResources() override {}
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "Haptic Console"; }

    bool acceptsMidi() const override  { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return true; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& dest) override;
    void setStateInformation(const void* data, int size) override;

    juce::AudioProcessorValueTreeState apvts;
    MidiMapper midiMapper;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(HapticConsoleProcessor)
};

} // namespace HapticConsole
