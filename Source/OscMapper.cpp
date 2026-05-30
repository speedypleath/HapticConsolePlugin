#include "OscMapper.h"
#include "Parameters.h"

namespace HapticConsole
{

OscMapper::OscMapper()
{
    using namespace ParamID;
    static const char* ids[] = {
        flywheelVelocity, flywheelDirection, pneumaticPressure,
        springTension,    springAcoustic,
        leanTotal,        leanBalance,
        matrixCentroidX,  matrixCentroidY, matrixPressure,
        joystick1X,       joystick1Y,
        joystick2X,       joystick2Y,
    };
    for (const auto* id : ids)
        addressMap[std::string("/haptic/") + id] = id;

    receiver.addListener(this);
    receiver.connect(currentPort);
}

OscMapper::~OscMapper()
{
    receiver.removeListener(this);
    receiver.disconnect();
}

void OscMapper::connect(juce::AudioProcessorValueTreeState* a)
{
    apvts = a;
}

bool OscMapper::setPort(int port)
{
    if (port == currentPort) return true;
    receiver.disconnect();
    if (receiver.connect(port))
    {
        currentPort = port;
        return true;
    }
    receiver.connect(currentPort); // fallback
    return false;
}

void OscMapper::setAddress(const juce::String& address, const juce::String& paramId)
{
    const std::string pid = paramId.toStdString();
    for (auto it = addressMap.begin(); it != addressMap.end(); )
    {
        if (it->second == pid)
            it = addressMap.erase(it);
        else
            ++it;
    }
    addressMap[address.toStdString()] = pid;
}

void OscMapper::oscMessageReceived(const juce::OSCMessage& msg)
{
    if (!apvts || msg.isEmpty()) return;

    auto it = addressMap.find(msg.getAddressPattern().toString().toStdString());
    if (it == addressMap.end()) return;

    float value = 0.0f;
    if (msg[0].isFloat32())      value = msg[0].getFloat32();
    else if (msg[0].isInt32())   value = static_cast<float>(msg[0].getInt32()) / 127.0f;

    value = juce::jlimit(0.0f, 1.0f, value);

    if (auto* param = apvts->getParameter(juce::String(it->second)))
        param->setValueNotifyingHost(value);
}

} // namespace HapticConsole
