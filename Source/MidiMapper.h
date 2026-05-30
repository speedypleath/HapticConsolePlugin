#pragma once
#include <juce_core/juce_core.h>
#include <unordered_map>

namespace HapticConsole
{

class MidiMapper
{
public:
    MidiMapper();

    juce::String paramForCC(int cc) const;
    void setMapping(int cc, juce::String paramId);
    const std::unordered_map<int, juce::String>& getMap() const { return map; }

private:
    std::unordered_map<int, juce::String> map;
};

} // namespace HapticConsole
