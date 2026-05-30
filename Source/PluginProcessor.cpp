#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "Parameters.h"

namespace HapticConsole
{

HapticConsoleProcessor::HapticConsoleProcessor()
    : AudioProcessor(BusesProperties()),
      apvts(*this, nullptr, "HapticConsole", createParameterLayout())
{
}

void HapticConsoleProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                          juce::MidiBuffer& midi)
{
    buffer.clear();

    for (const auto meta : midi)
    {
        const auto msg = meta.getMessage();
        if (!msg.isController())
            continue;

        const auto paramId = midiMapper.paramForCC(msg.getControllerNumber());
        if (paramId.isEmpty())
            continue;

        if (auto* param = apvts.getParameter(paramId))
            param->setValueNotifyingHost(static_cast<float>(msg.getControllerValue()) / 127.0f);
    }
}

juce::AudioProcessorEditor* HapticConsoleProcessor::createEditor()
{
    return new HapticConsoleEditor(*this);
}

void HapticConsoleProcessor::getStateInformation(juce::MemoryBlock& dest)
{
    if (auto xml = apvts.copyState().createXml())
        copyXmlToBinary(*xml, dest);
}

void HapticConsoleProcessor::setStateInformation(const void* data, int size)
{
    if (auto xml = getXmlFromBinary(data, size))
        apvts.replaceState(juce::ValueTree::fromXml(*xml));
}

} // namespace HapticConsole

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new HapticConsole::HapticConsoleProcessor();
}
