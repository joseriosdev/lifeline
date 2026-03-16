const dobInput = document.getElementById('dob-input');
const gridContainer = document.getElementById('lifeGrid');
const statsPanel = document.getElementById('stats');

const calculateAndRenderGrid = (dob) =>
{
    const lifespanYears = 80;
    const weeksPerYear = 52;
    const totalWeeks = lifespanYears * weeksPerYear;
    const today = new Date();
    const millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
    
    if (isNaN(dob.getTime()))
    {
        statsPanel.textContent = 'Por favor, introduce una fecha de nacimiento correcta.';
        gridContainer.innerHTML = '';
        return;
    }
    
    const weeksLived = Math.floor((today - dob) / millisecondsPerWeek);
    const timeSleeping = Math.ceil((totalWeeks - weeksLived) / 3);
    const timeRemainingSleeping = totalWeeks - timeSleeping;
    
    gridContainer.innerHTML = '';

    for (let i = 0; i < totalWeeks; i++)
    {
        const square = document.createElement('div');
        square.classList.add('week-square');

        if (i < weeksLived)
        {
            square.classList.add('week-lived');
        }
        else if (i >= timeRemainingSleeping)
        {
            square.classList.add('week-slept');
        }
        else
        {
            square.classList.add('week-remaining');
        }
        gridContainer.appendChild(square);
    }

    const statsPanel = document.getElementById('stats');
    const weeksRemaining = totalWeeks - weeksLived;
    statsPanel.innerHTML = `Has vivido <b>${weeksLived} semanas</b> de un total de <b>${totalWeeks} semanas</b>. Tienes <b>${weeksRemaining} semanas</b> restantes.`;
}

calculateAndRenderGrid(new Date(dobInput.value));

// Update grid on date change
dobInput.addEventListener('change', (event) => {
    const newDob = new Date(event.target.value);
    calculateAndRenderGrid(newDob);
});
