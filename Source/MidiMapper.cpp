#include "MidiMapper.h"
#include "Parameters.h"

namespace HapticConsole
{

MidiMapper::MidiMapper()
{
    using namespace ParamID;
    map = {
        {  1, flywheelVelocity  },
        {  2, flywheelDirection },
        {  3, pneumaticPressure },
        {  4, springTension     },
        {  5, springAcoustic    },
        {  6, leanTotal         },
        {  7, leanBalance       },
        {  8, matrixCentroidX   },
        {  9, matrixCentroidY   },
        { 10, matrixPressure    },
        { 11, joystick1X        },
        { 12, joystick1Y        },
        { 13, joystick2X        },
        { 14, joystick2Y        },
    };
}

juce::String MidiMapper::paramForCC(int cc) const
{
    auto it = map.find(cc);
    return it != map.end() ? it->second : juce::String{};
}

void MidiMapper::setMapping(int cc, juce::String paramId)
{
    map[cc] = std::move(paramId);
}

} // namespace HapticConsole
