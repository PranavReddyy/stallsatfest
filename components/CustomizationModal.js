import { useState, useEffect } from 'react';
import { Crimson_Text } from 'next/font/google';

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function CustomizationModal({ item, onClose, onSubmit }) {
    const [customizationSelections, setCustomizationSelections] = useState({});
    const [extraSelections, setExtraSelections] = useState({});
    const [totalPrice, setTotalPrice] = useState(item.price);
    const [isReady, setIsReady] = useState(false);

    // Check if all required customizations are selected
    useEffect(() => {
        let ready = true;

        // If there are required customizations, make sure they are all selected
        if (item.customizations) {
            item.customizations.forEach(customization => {
                if (customization.required && !customizationSelections[customization.id]) {
                    ready = false;
                }
            });
        }

        setIsReady(ready);

        // Calculate total price
        let price = item.price;

        // Add customization prices
        Object.entries(customizationSelections).forEach(([customId, optionId]) => {
            const customization = item.customizations?.find(c => c.id === customId);
            if (customization) {
                const option = customization.options.find(o => o.id === optionId);
                if (option) {
                    price += option.price;
                }
            }
        });

        // Add extras prices
        Object.entries(extraSelections).forEach(([extraId, isSelected]) => {
            if (isSelected) {
                const extra = item.extras?.find(e => e.id === extraId);
                if (extra) {
                    price += extra.price;
                }
            }
        });

        setTotalPrice(price);
    }, [customizationSelections, extraSelections, item]);

    // Simple close without confirmation
    const handleClose = () => {
        onClose();
    };

    // Handle customization option selection
    const handleCustomizationChange = (customizationId, optionId) => {
        setCustomizationSelections(prev => ({
            ...prev,
            [customizationId]: optionId
        }));
    };

    // Handle extra toggle
    const handleExtraToggle = (extraId) => {
        setExtraSelections(prev => ({
            ...prev,
            [extraId]: !prev[extraId]
        }));
    };

    // Handle submission
    const handleSubmit = () => {
        if (!isReady) return;
        onSubmit(customizationSelections, extraSelections);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose} // Simply close on backdrop click
            ></div>

            <div className="bg-gray-900 w-full max-w-md rounded-t-xl sm:rounded-xl shadow-2xl z-10 animate-slideUp overflow-hidden relative">
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800/50 transition-all duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 p-4 border-b border-gray-800">
                    <h2 className={`${crimsonText.className} text-xl font-semibold text-white`}>
                        Customize {item.name}
                    </h2>
                    <p className="text-gray-300 text-sm mt-1">
                        Select your preferences
                    </p>
                </div>

                <div className="max-h-[40vh] overflow-y-auto hide-scrollbar">
                    {/* Customizations */}
                    {item.customizations && item.customizations.length > 0 && (
                        <div className="p-4 border-b border-gray-800">
                            {item.customizations.map((customization) => (
                                <div key={customization.id} className="mb-4">
                                    <div className="flex items-center mb-2">
                                        <h3 className="text-white font-medium">
                                            {customization.name}
                                        </h3>
                                        {customization.required && (
                                            <span className="text-red-400 text-xs ml-2">
                                                *Required
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {customization.options.map((option) => {
                                            // Check if option is available
                                            const isOptionAvailable = option.isAvailable !== false;

                                            return (
                                                <div
                                                    key={option.id}
                                                    className={`flex items-center justify-between p-2 rounded-lg ${!isOptionAvailable
                                                        ? 'bg-red-900/20 border border-red-900/30 cursor-not-allowed opacity-60'
                                                        : customizationSelections[customization.id] === option.id
                                                            ? 'bg-purple-900/50 border border-purple-500/50 cursor-pointer'
                                                            : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800 cursor-pointer'
                                                        }`}
                                                    onClick={() => isOptionAvailable && handleCustomizationChange(customization.id, option.id)}
                                                >
                                                    <div className="flex items-center">
                                                        <div className={`w-4 h-4 rounded-full mr-3 border flex items-center justify-center ${!isOptionAvailable
                                                            ? 'border-red-600'
                                                            : customizationSelections[customization.id] === option.id
                                                                ? 'border-purple-500'
                                                                : 'border-gray-600'
                                                            }`}>
                                                            {customizationSelections[customization.id] === option.id && (
                                                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="text-white text-sm">{option.name}</span>
                                                            {!isOptionAvailable && (
                                                                <span className="text-red-400 text-xs ml-2">Out of Stock</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {option.price > 0 && (
                                                        <span className="text-purple-300 text-sm">+₹{option.price}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Show warning for required customizations that haven't been selected */}
                                    {customization.required && !customizationSelections[customization.id] && (
                                        <p className="text-red-400 text-xs mt-1">Please select an option</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Extras */}
                    {item.extras.map((extra) => {
                        // Check if extra is available
                        const isExtraAvailable = extra.isAvailable !== false;

                        return (
                            <div
                                key={extra.id}
                                className={`flex items-center justify-between p-2 rounded-lg ${!isExtraAvailable
                                        ? 'bg-red-900/20 border border-red-900/30 cursor-not-allowed opacity-60'
                                        : extraSelections[extra.id]
                                            ? 'bg-purple-900/50 border border-purple-500/50 cursor-pointer'
                                            : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800 cursor-pointer'
                                    }`}
                                onClick={() => isExtraAvailable && handleExtraToggle(extra.id)}
                            >
                                <div className="flex items-center">
                                    <div className={`w-4 h-4 rounded-sm mr-3 border ${!isExtraAvailable
                                            ? 'border-red-600'
                                            : extraSelections[extra.id]
                                                ? 'border-purple-500 bg-purple-500 flex items-center justify-center'
                                                : 'border-gray-600'
                                        }`}>
                                        {extraSelections[extra.id] && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-white text-sm">{extra.name}</span>
                                        {!isExtraAvailable && (
                                            <span className="text-red-400 text-xs ml-2">Out of Stock</span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-purple-300 text-sm">+₹{extra.price}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 bg-gradient-to-t from-gray-900 to-gray-900/80">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <p className="text-sm text-gray-300">Total Price</p>
                            <p className={`${crimsonText.className} text-xl font-semibold text-white`}>
                                ₹{totalPrice}
                            </p>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!isReady}
                            className={`py-2 px-6 rounded-full text-sm font-medium transition-all duration-200 ${isReady
                                ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-700/20 active:scale-98'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isReady ? `Add to Cart • ₹${totalPrice}` : 'Select Required Options'}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-white text-sm hover:underline"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}