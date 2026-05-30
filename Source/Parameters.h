#pragma once
#include <juce_audio_processors/juce_audio_processors.h>

namespace HapticConsole
{

namespace ParamID
{
    inline constexpr const char* flywheelVelocity  = "flywheel_velocity";
    inline constexpr const char* flywheelDirection = "flywheel_direction";
    inline constexpr const char* pneumaticPressure  = "pneumatic_pressure";
    inline constexpr const char* springTension      = "spring_tension";
    inline constexpr const char* springAcoustic     = "spring_acoustic";
    inline constexpr const char* leanTotal          = "lean_total";
    inline constexpr const char* leanBalance        = "lean_balance";
    inline constexpr const char* matrixCentroidX    = "matrix_centroid_x";
    inline constexpr const char* matrixCentroidY    = "matrix_centroid_y";
    inline constexpr const char* matrixPressure     = "matrix_pressure";
    inline constexpr const char* joystick1X         = "joystick_1_x";
    inline constexpr const char* joystick1Y         = "joystick_1_y";
    inline constexpr const char* joystick2X         = "joystick_2_x";
    inline constexpr const char* joystick2Y         = "joystick_2_y";
}

inline juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout()
{
    using namespace juce;
    std::vector<std::unique_ptr<RangedAudioParameter>> params;

    auto addUnipolar = [&](const char* id, const char* name)
    {
        params.push_back(std::make_unique<AudioParameterFloat>(
            ParameterID { id, 1 }, name,
            NormalisableRange<float>(0.0f, 1.0f), 0.0f));
    };

    auto addBipolar = [&](const char* id, const char* name)
    {
        params.push_back(std::make_unique<AudioParameterFloat>(
            ParameterID { id, 1 }, name,
            NormalisableRange<float>(-1.0f, 1.0f), 0.0f));
    };

    addUnipolar(ParamID::flywheelVelocity,  "Flywheel Velocity");
    addUnipolar(ParamID::flywheelDirection, "Flywheel Direction");
    addUnipolar(ParamID::pneumaticPressure, "Pneumatic Pressure");
    addUnipolar(ParamID::springTension,     "Spring Tension");
    addUnipolar(ParamID::springAcoustic,    "Spring Acoustic");
    addBipolar (ParamID::leanTotal,         "Lean Total");
    addBipolar (ParamID::leanBalance,       "Lean Balance");
    addUnipolar(ParamID::matrixCentroidX,   "Matrix Centroid X");
    addUnipolar(ParamID::matrixCentroidY,   "Matrix Centroid Y");
    addUnipolar(ParamID::matrixPressure,    "Matrix Pressure");
    addUnipolar(ParamID::joystick1X,        "Joystick 1 X");
    addUnipolar(ParamID::joystick1Y,        "Joystick 1 Y");
    addUnipolar(ParamID::joystick2X,        "Joystick 2 X");
    addUnipolar(ParamID::joystick2Y,        "Joystick 2 Y");

    return { params.begin(), params.end() };
}

} // namespace HapticConsole
