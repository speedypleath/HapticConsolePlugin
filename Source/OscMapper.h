#pragma once
#include <juce_osc/juce_osc.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <unordered_map>
#include <string>

namespace HapticConsole
{

class OscMapper : private juce::OSCReceiver::Listener<juce::OSCReceiver::MessageLoopCallback>
{
public:
    OscMapper();
    ~OscMapper();

    void connect(juce::AudioProcessorValueTreeState* apvts);
    bool setPort(int port);
    void setAddress(const juce::String& address, const juce::String& paramId);

    int getPort() const { return currentPort; }
    const std::unordered_map<std::string, std::string>& getAddresses() const { return addressMap; }

private:
    void oscMessageReceived(const juce::OSCMessage& msg) override;

    juce::OSCReceiver receiver;
    juce::AudioProcessorValueTreeState* apvts = nullptr;
    std::unordered_map<std::string, std::string> addressMap; // address → paramId
    int currentPort = 8000;
};

} // namespace HapticConsole
