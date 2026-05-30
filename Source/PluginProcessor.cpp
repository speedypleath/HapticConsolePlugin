#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "Parameters.h"

namespace HapticConsole
{

HapticConsoleProcessor::HapticConsoleProcessor()
    : AudioProcessor(BusesProperties()),
      apvts(*this, nullptr, "HapticConsole", createParameterLayout())
{
    oscMapper.connect(&apvts);
}

void HapticConsoleProcessor::startMidiLearn(const juce::String& paramId)
{
    juce::SpinLock::ScopedLockType sl(learnLock);
    learnParamId = paramId;
    midiLearnActive.store(true);
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

        if (midiLearnActive.load())
        {
            juce::SpinLock::ScopedLockType sl(learnLock);
            if (!learnParamId.isEmpty())
            {
                const int cc = msg.getControllerNumber();
                juce::String pid = learnParamId;
                midiMapper.setMapping(cc, pid);
                learnParamId = {};
                midiLearnActive.store(false);

                juce::MessageManager::callAsync([this, cc, pid]()
                {
                    juce::ScopedLock csl(learnCallbackLock);
                    if (onLearnComplete) onLearnComplete(pid, cc);
                });
            }
        }

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
    juce::XmlElement root("PluginState");

    if (auto xml = apvts.copyState().createXml())
        root.addChildElement(xml.release());

    auto* midiEl = root.createNewChildElement("MidiMap");
    for (const auto& [cc, pid] : midiMapper.getMap())
    {
        auto* e = midiEl->createNewChildElement("CC");
        e->setAttribute("n", cc);
        e->setAttribute("param", pid);
    }

    auto* oscEl = root.createNewChildElement("OscConfig");
    oscEl->setAttribute("port", oscMapper.getPort());
    for (const auto& [addr, pid] : oscMapper.getAddresses())
    {
        auto* e = oscEl->createNewChildElement("Addr");
        e->setAttribute("path", juce::String(addr));
        e->setAttribute("param", juce::String(pid));
    }

    copyXmlToBinary(root, dest);
}

void HapticConsoleProcessor::setStateInformation(const void* data, int size)
{
    if (auto xml = getXmlFromBinary(data, size))
    {
        if (auto* avts = xml->getChildByName("HapticConsole"))
            apvts.replaceState(juce::ValueTree::fromXml(*avts));

        if (auto* midiEl = xml->getChildByName("MidiMap"))
        {
            forEachXmlChildElement(*midiEl, e)
                midiMapper.setMapping(e->getIntAttribute("n"),
                                      e->getStringAttribute("param"));
        }

        if (auto* oscEl = xml->getChildByName("OscConfig"))
        {
            oscMapper.setPort(oscEl->getIntAttribute("port", 8000));
            forEachXmlChildElement(*oscEl, e)
                oscMapper.setAddress(e->getStringAttribute("path"),
                                     e->getStringAttribute("param"));
        }
    }
}

} // namespace HapticConsole

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new HapticConsole::HapticConsoleProcessor();
}
