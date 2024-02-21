export default {
    action_name: "Change Max Health",
    max_health: {
        slot: 10,
        default_value: 20,
        type: "anvil_input"
    },
    mode: {
        slot: 11,
        default_value: "INCREMENT",
        type: "static_option_select",
        options: [
            "Increment",
            "Decrement",
            "Set",
            "Multiply",
            "Divide"
        ]
    },
    heal_on_change: {
        slot: 12,
        default_value: true,
        type: "toggle"
    }
}